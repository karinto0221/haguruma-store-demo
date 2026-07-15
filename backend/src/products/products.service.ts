import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from './product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImageProcessingService } from '../image/image-processing.service';

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  priceFrom: number;
  productCategoryId: number;
  productCategoryName: string;
  imageUrl?: string;
}

export interface CatalogImage {
  data: Buffer;
  mimeType: string;
}

// Postgresの一意制約違反(id重複) / 外部キー制約違反(参照している注文が残っている状態で削除しようとした)
const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  async findAll(): Promise<ProductRecord[]> {
    const entities = await this.productsRepository.find({
      relations: ['productCategory'],
      order: { createdAt: 'ASC' },
    });
    return entities.map((e) => this.toRecord(e));
  }

  async findById(id: string): Promise<ProductRecord | undefined> {
    const entity = await this.productsRepository.findOne({
      where: { id },
      relations: ['productCategory'],
    });
    return entity ? this.toRecord(entity) : undefined;
  }

  async findImage(id: string): Promise<CatalogImage> {
    const entity = await this.productsRepository
      .createQueryBuilder('product')
      .addSelect('product.imageData')
      .where('product.id = :id', { id })
      .getOne();
    if (!entity) throw new NotFoundException('指定された商品が見つかりません');
    if (!entity.imageData || !entity.imageMimeType) {
      throw new NotFoundException('商品画像が登録されていません');
    }
    const image = await this.imageProcessingService.normalize(
      entity.imageData,
      entity.imageMimeType,
    );
    if (image.mimeType !== entity.imageMimeType) {
      await this.productsRepository.update(id, {
        imageData: image.data,
        imageMimeType: image.mimeType,
      });
    }
    return { data: image.data, mimeType: image.mimeType };
  }

  async updateImage(id: string, file?: Express.Multer.File): Promise<ProductRecord> {
    if (
      !file ||
      (!file.mimetype.startsWith('image/') &&
        !this.imageProcessingService.isHeic(file.mimetype, file.originalname))
    ) {
      throw new BadRequestException('画像ファイルを選択してください');
    }
    const entity = await this.productsRepository.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('指定された商品が見つかりません');
    const image = await this.imageProcessingService.normalizeUpload(file);
    entity.imageData = image.data;
    entity.imageMimeType = image.mimeType;
    await this.productsRepository.save(entity);
    const saved = await this.productsRepository.findOne({
      where: { id },
      relations: ['productCategory'],
    });
    return this.toRecord(saved!);
  }

  async create(dto: CreateProductDto): Promise<ProductRecord> {
    // repository.save()は主キーが既存の場合UPDATEになってしまう(id重複を弾けない)ため、
    // 新規作成では常にINSERTのみ行うinsert()を使う
    try {
      await this.productsRepository.insert({
        id: dto.id,
        name: dto.name,
        description: dto.description,
        priceFrom: dto.priceFrom,
        productCategoryId: dto.productCategoryId,
      });
    } catch (e: any) {
      throw this.translateWriteError(e, dto.productCategoryId);
    }

    const saved = await this.productsRepository.findOne({
      where: { id: dto.id },
      relations: ['productCategory'],
    });
    return this.toRecord(saved!);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductRecord> {
    const entity = await this.productsRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('指定された商品が見つかりません');
    }

    entity.name = dto.name;
    entity.description = dto.description;
    entity.priceFrom = dto.priceFrom;
    entity.productCategoryId = dto.productCategoryId;

    try {
      await this.productsRepository.save(entity);
    } catch (e: any) {
      throw this.translateWriteError(e, dto.productCategoryId);
    }

    const saved = await this.productsRepository.findOne({
      where: { id },
      relations: ['productCategory'],
    });
    return this.toRecord(saved!);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.productsRepository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException('指定された商品が見つかりません');
    }
    try {
      await this.productsRepository.remove(entity);
    } catch (e: any) {
      if (e?.code === FOREIGN_KEY_VIOLATION) {
        throw new ConflictException(
          'この商品を参照している注文が存在するため削除できません',
        );
      }
      throw e;
    }
  }

  private translateWriteError(e: any, productCategoryId: number) {
    if (e?.code === UNIQUE_VIOLATION) {
      return new ConflictException('このIDは既に使用されています');
    }
    if (e?.code === FOREIGN_KEY_VIOLATION) {
      return new NotFoundException(
        `指定されたカテゴリ(id: ${productCategoryId})が見つかりません`,
      );
    }
    return e;
  }

  private toRecord(entity: ProductEntity): ProductRecord {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      priceFrom: entity.priceFrom,
      productCategoryId: entity.productCategoryId,
      productCategoryName: entity.productCategory?.name ?? '',
      imageUrl: entity.imageMimeType
        ? `/products/${encodeURIComponent(entity.id)}/image?v=${entity.updatedAt.getTime()}`
        : undefined,
    };
  }
}
