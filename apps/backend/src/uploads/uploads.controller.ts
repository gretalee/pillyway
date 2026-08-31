import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private readonly uploadsService: UploadsService) {}

  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload up to 10 images (pilgrim role required)',
    description:
      'Accepts multipart/form-data with a `files` field. Maximum 10 files, 10 MB each. Only image/* MIME types are accepted.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description:
            'Up to 10 image files (JPEG, PNG, WebP, HEIC/HEIF), 10 MB each.',
        },
        names: {
          type: 'string',
          description:
            'Optional JSON-encoded array of display names, positionally matched to `files` ' +
            '(e.g. \'["Mein schönes Bild", null]\' — null/missing entries get a generated name). ' +
            'Each given name is sanitized and combined with a unique suffix, so it can never ' +
            'overwrite an existing image. Malformed JSON is ignored — all files fall back to ' +
            'generated names rather than failing the upload.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Upload successful. Returns an array of public URLs.',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          cb(new BadRequestException('Only image files are allowed'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('names') namesRaw?: string,
  ): Promise<{ urls: string[] }> {
    return this.uploadsService.uploadImages(files, this.parseNames(namesRaw));
  }

  // `names` is purely cosmetic (S3 key readability) — malformed JSON must
  // never fail the whole upload, just fall back to generated names for
  // every file, same as if `names` had never been sent.
  private parseNames(
    namesRaw: string | undefined,
  ): (string | undefined)[] | undefined {
    if (!namesRaw) return undefined;
    try {
      const parsed: unknown = JSON.parse(namesRaw);
      if (!Array.isArray(parsed)) return undefined;
      return parsed.map((n) => (typeof n === 'string' ? n : undefined));
    } catch (err) {
      this.logger.debug(`Ignoring malformed 'names' field: ${String(err)}`);
      return undefined;
    }
  }
}
