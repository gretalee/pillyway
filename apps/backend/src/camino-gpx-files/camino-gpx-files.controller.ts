import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { CaminoGpxFilesService } from './camino-gpx-files.service';
import { CaminoGpxFileResponseDto } from './dto/camino-gpx-file-response.dto';
import { UploadCaminoGpxFileDto } from './dto/upload-camino-gpx-file.dto';

const FIVE_MB = 5 * 1024 * 1024;

@ApiTags('camino-gpx-files')
@Controller('caminos/:caminoId/gpx-files')
export class CaminoGpxFilesController {
  private readonly logger = new Logger(CaminoGpxFilesController.name);

  constructor(private readonly caminoGpxFilesService: CaminoGpxFilesService) {}

  // ── GET /caminos/:caminoId/gpx-files ────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all GPX files for a camino (public)' })
  @ApiOkResponse({
    description: 'GPX file list sorted newest-first.',
    type: [CaminoGpxFileResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async getGpxFiles(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
  ): Promise<CaminoGpxFileResponseDto[]> {
    return this.caminoGpxFilesService.getGpxFiles(caminoId);
  }

  // ── POST /caminos/:caminoId/gpx-files ───────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: FIVE_MB } }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a GPX file for a camino (pilgrim role required)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'fileName', 'uploaderName'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'GPX file (max 5 MB)',
        },
        fileName: {
          type: 'string',
          maxLength: 100,
          description: 'Display name for the file',
        },
        uploaderName: {
          type: 'string',
          maxLength: 200,
          description: "Uploader's display name (max 200 chars)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'GPX file uploaded.',
    type: CaminoGpxFileResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  @ApiResponse({ status: 413, description: 'File exceeds 5 MB.' })
  @ApiResponse({ status: 415, description: 'Declared MIME type not accepted.' })
  @ApiResponse({ status: 409, description: 'Per-camino file limit (20) reached.' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid GPX content.' })
  async uploadGpxFile(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Body() dto: UploadCaminoGpxFileDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: FIVE_MB,
            message: 'File exceeds the maximum size of 5 MB',
          }),
          new FileTypeValidator({
            fileType:
              /^(application\/gpx\+xml|text\/xml|application\/xml|application\/octet-stream)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<CaminoGpxFileResponseDto> {
    const uploaderName =
      dto.uploaderName
        .replace(/[<>"'&]/g, '')
        .trim()
        .slice(0, 200) || 'no name';

    return this.caminoGpxFilesService.uploadGpxFile(
      caminoId,
      file,
      dto,
      req.user.sub,
      uploaderName,
    );
  }

  // ── DELETE /caminos/:caminoId/gpx-files/:gpxFileId ──────────────────────────

  // Guard checks pilgrim only: every owner is also assigned pilgrim in Kinde,
  // so the @Roles('pilgrim') guard admits owners without a separate check.
  @Delete(':gpxFileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a GPX file (uploader or owner role required)',
  })
  @ApiNoContentResponse({ description: 'GPX file deleted.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description: 'Not the uploader and does not hold owner role.',
  })
  @ApiNotFoundResponse({ description: 'GPX file not found.' })
  @ApiResponse({
    status: 502,
    description: 'S3 deletion failed — database record preserved.',
  })
  async deleteGpxFile(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Param('gpxFileId', ParseUUIDPipe) gpxFileId: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<void> {
    return this.caminoGpxFilesService.deleteGpxFile(
      caminoId,
      gpxFileId,
      req.user.sub,
      req.user.roles ?? [],
    );
  }

  // ── GET /caminos/:caminoId/gpx-files/:gpxFileId/download ────────────────────

  @Get(':gpxFileId/download')
  @ApiOperation({ summary: 'Download a GPX file (public)' })
  @ApiProduces('application/gpx+xml')
  @ApiOkResponse({ description: 'GPX file stream.' })
  @ApiNotFoundResponse({ description: 'GPX file not found.' })
  async downloadGpxFile(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Param('gpxFileId', ParseUUIDPipe) gpxFileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, contentLength, fileName } =
      await this.caminoGpxFilesService.downloadGpxFile(caminoId, gpxFileId);

    const baseName = fileName.endsWith('.gpx') ? fileName.slice(0, -4) : fileName;
    const safeAscii = baseName
      .replace(/[\r\n"\\]/g, '')
      .replace(/[^\x20-\x7E]/g, '_');
    const encoded = encodeURIComponent(baseName);

    res.setHeader('Content-Type', 'application/gpx+xml');
    if (contentLength !== undefined) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeAscii}.gpx"; filename*=UTF-8''${encoded}.gpx`,
    );
    res.setTimeout(15_000, () =>
      res.destroy(new Error('GPX download timeout')),
    );

    stream.on('error', (err) => {
      this.logger.error(
        `GPX stream error for gpxFileId=${gpxFileId}: ${String(err)}`,
      );
      res.destroy(err);
    });
    stream.pipe(res);
  }
}
