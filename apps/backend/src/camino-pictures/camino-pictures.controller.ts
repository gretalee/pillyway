import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { KindeJwtPayload } from '../auth/kinde-jwt.strategy';
import { CaminoPicturesService } from './camino-pictures.service';
import {
  CaminoPictureResponseDto,
  CaminoPicturesResponseDto,
} from './dto/camino-picture-response.dto';
import { UploadCaminoPictureDto } from './dto/upload-camino-picture.dto';

const TEN_MB = 10 * 1024 * 1024;

@ApiTags('camino-pictures')
@Controller('caminos/:caminoId/pictures')
export class CaminoPicturesController {
  constructor(private readonly caminoPicturesService: CaminoPicturesService) {}

  // ── GET /caminos/:caminoId/pictures ─────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary: 'Get all pictures for a camino (public)',
    description:
      'Returns the primary picture and the ordered gallery. Returns 404 if the camino does not exist.',
  })
  @ApiOkResponse({
    description: 'Primary picture and gallery array.',
    type: CaminoPicturesResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  async getPictures(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
  ): Promise<CaminoPicturesResponseDto> {
    return this.caminoPicturesService.getPictures(caminoId);
  }

  // ── POST /caminos/:caminoId/pictures ────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: TEN_MB },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a picture for a camino (pilgrim role required)',
    description:
      'Uploads an image as either the primary (hero) picture or a gallery picture. ' +
      'MIME validation is two-layered: declared Content-Type header (FileTypeValidator) and magic-byte inspection (file-type). ' +
      'Maximum file size: 10 MB. Maximum pictures per camino: 50.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'isPrimary'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, or WebP, max 10 MB)',
        },
        isPrimary: {
          type: 'string',
          enum: ['true', 'false'],
          description: 'Whether to upload as the primary (hero) picture',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Picture uploaded successfully.',
    type: CaminoPictureResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({ description: 'Requires pilgrim role.' })
  @ApiNotFoundResponse({ description: 'Camino not found.' })
  @ApiConflictResponse({
    description: 'isPrimary=true requested but a primary picture already exists.',
  })
  @ApiUnprocessableEntityResponse({
    description: 'Camino has reached the maximum of 50 pictures.',
  })
  async uploadPicture(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Body() dto: UploadCaminoPictureDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: TEN_MB,
            message: 'File exceeds the maximum size of 10 MB',
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<CaminoPictureResponseDto> {
    return this.caminoPicturesService.uploadPicture(
      caminoId,
      file,
      dto.isPrimary,
      req.user.sub,
    );
  }

  // ── DELETE /caminos/:caminoId/pictures/:pictureId ───────────────────────────

  @Delete(':pictureId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('pilgrim')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a picture (pilgrim role required)',
    description:
      'Deletes the S3 object first, then the database record. ' +
      'A pilgrim may only delete pictures they uploaded. An owner (with both pilgrim and owner roles) may delete any picture. ' +
      'If S3 deletion fails, a 502 is returned and the database record is preserved.',
  })
  @ApiNoContentResponse({ description: 'Picture deleted successfully.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT.' })
  @ApiForbiddenResponse({
    description:
      'Requires pilgrim role, or pilgrim holds it but is not the uploader and does not hold owner role.',
  })
  @ApiNotFoundResponse({
    description: 'No picture with the given pictureId exists under the given caminoId.',
  })
  @ApiResponse({
    status: 502,
    description: 'S3 deletion failed — database record preserved.',
  })
  async deletePicture(
    @Param('caminoId', ParseUUIDPipe) caminoId: string,
    @Param('pictureId', ParseUUIDPipe) pictureId: string,
    @Req() req: Request & { user: KindeJwtPayload },
  ): Promise<void> {
    return this.caminoPicturesService.deletePicture(
      caminoId,
      pictureId,
      req.user.sub,
      req.user.roles ?? [],
    );
  }
}
