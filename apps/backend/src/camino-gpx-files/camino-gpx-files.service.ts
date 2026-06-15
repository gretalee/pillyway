import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import { plainToInstance } from 'class-transformer';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

import { KindeRole } from '../auth/kinde-jwt.strategy';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/event-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { CaminoGpxFileResponseDto } from './dto/camino-gpx-file-response.dto';
import { UploadCaminoGpxFileDto } from './dto/upload-camino-gpx-file.dto';
import { GpxStorageService } from './gpx-storage.service';

const MAX_GPX_FILES = 20;
const VALID_GPX_NAMESPACES = [
  'http://www.topografix.com/GPX/1/1',
  'http://www.topografix.com/GPX/1/0',
];

@Injectable()
export class CaminoGpxFilesService {
  private readonly logger = new Logger(CaminoGpxFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gpxStorage: GpxStorageService,
    private readonly eventLog: EventLogService,
  ) {}

  async getGpxFiles(caminoId: string): Promise<CaminoGpxFileResponseDto[]> {
    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
      select: { id: true },
    });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    const records = await this.prisma.caminoGpxFile.findMany({
      where: { caminoId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) =>
      plainToInstance(CaminoGpxFileResponseDto, r, { excludeExtraneousValues: true }),
    );
  }

  async uploadGpxFile(
    caminoId: string,
    file: Express.Multer.File,
    dto: UploadCaminoGpxFileDto,
    userId: string,
    uploaderName: string,
  ): Promise<CaminoGpxFileResponseDto> {
    const camino = await this.prisma.camino.findUnique({
      where: { id: caminoId },
      select: { id: true, name: true },
    });
    if (!camino) {
      throw new NotFoundException('Camino not found.');
    }

    const count = await this.prisma.caminoGpxFile.count({ where: { caminoId } });
    if (count >= MAX_GPX_FILES) {
      throw new UnprocessableEntityException(
        'This camino has reached the maximum of 20 GPX files.',
      );
    }

    this.validateGpx(file.buffer);

    const fileId = randomUUID();
    const storageKey = `camino-gpx-files/${caminoId}/${fileId}.gpx`;

    await this.gpxStorage.uploadGpxFile(storageKey, file.buffer);

    let record;
    try {
      record = await this.prisma.caminoGpxFile.create({
        data: {
          caminoId,
          uploadedBy: userId,
          uploaderName,
          fileName: dto.fileName,
          storageKey,
        },
      });
    } catch (err) {
      this.gpxStorage.deleteGpxFile(storageKey).catch((cleanupErr) => {
        this.logger.error('Orphaned GPX object cleanup failed', {
          storageKey,
          caminoId,
          error: String(cleanupErr),
        });
      });
      throw err;
    }

    this.eventLog.logEvent(EventType.CAMINO_GPX_UPLOADED, userId, {
      camino_id: caminoId,
      camino_name: camino.name,
      gpx_file_id: record.id,
      file_name: dto.fileName,
    });

    return plainToInstance(CaminoGpxFileResponseDto, record, {
      excludeExtraneousValues: true,
    });
  }

  async downloadGpxFile(
    caminoId: string,
    gpxFileId: string,
  ): Promise<{ stream: Readable; contentLength: number | undefined; fileName: string }> {
    // Both id AND caminoId required — IDOR prevention
    const record = await this.prisma.caminoGpxFile.findFirst({
      where: { id: gpxFileId, caminoId },
    });
    if (!record) {
      throw new NotFoundException('GPX file not found.');
    }

    const { stream, contentLength } = await this.gpxStorage.streamGpxFile(record.storageKey);
    return { stream, contentLength, fileName: record.fileName };
  }

  async deleteGpxFile(
    caminoId: string,
    gpxFileId: string,
    userId: string,
    userRoles: KindeRole[],
  ): Promise<void> {
    // Both id AND caminoId required — IDOR prevention
    const record = await this.prisma.caminoGpxFile.findFirst({
      where: { id: gpxFileId, caminoId },
    });
    if (!record) {
      throw new NotFoundException('GPX file not found.');
    }

    const isUploader = record.uploadedBy === userId;
    const isOwner = userRoles.some((r) => r.key === 'owner');
    if (!isUploader && !isOwner) {
      throw new ForbiddenException('You do not have permission to delete this GPX file.');
    }

    // S3 first — BadGatewayException propagates; DB record is NOT touched on failure
    await this.gpxStorage.deleteGpxFile(record.storageKey);

    await this.prisma.caminoGpxFile.delete({ where: { id: gpxFileId } });

    this.eventLog.logEvent(EventType.CAMINO_GPX_DELETED, userId, {
      camino_id: caminoId,
      gpx_file_id: gpxFileId,
      file_name: record.fileName,
    });
  }

  private validateGpx(buffer: Buffer): void {
    const raw = buffer.toString('utf-8');

    // Pre-parse guard: reject DTD/entity declarations (billion-laughs prevention)
    if (/<!DOCTYPE/i.test(raw) || /<!ENTITY/i.test(raw)) {
      throw new UnprocessableEntityException(
        'GPX files must not contain DOCTYPE declarations or internal entities.',
      );
    }

    const parser = new DOMParser({
      errorHandler: (level: string, msg: string) => {
        if (level === 'warning') {
          this.logger.warn(`GPX XML warning: ${msg}`);
        } else {
          throw new UnprocessableEntityException(`The file is not valid XML: ${msg}`);
        }
      },
    });

    // xmldom wraps exceptions thrown from errorHandler into a ParseError and re-throws.
    let doc;
    try {
      doc = parser.parseFromString(raw, 'text/xml');
    } catch {
      throw new UnprocessableEntityException('The file is not valid XML.');
    }
    const root = doc.documentElement;

    if (!root || root.localName !== 'gpx') {
      throw new UnprocessableEntityException('The file is not a valid GPX file.');
    }

    // Support both default xmlns= and prefixed namespace (e.g. OsmAnd/Garmin exports)
    const ns = root.getAttribute('xmlns') ?? root.namespaceURI;

    if (!ns || !VALID_GPX_NAMESPACES.includes(ns)) {
      throw new UnprocessableEntityException('The file is not a valid GPX file.');
    }

    const hasContent = VALID_GPX_NAMESPACES.some(
      (n) =>
        doc.getElementsByTagNameNS(n, 'trk').length > 0 ||
        doc.getElementsByTagNameNS(n, 'rte').length > 0 ||
        doc.getElementsByTagNameNS(n, 'wpt').length > 0,
    );

    if (!hasContent) {
      throw new UnprocessableEntityException(
        'GPX file contains no tracks, routes, or waypoints.',
      );
    }
  }
}
