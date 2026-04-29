import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  AMENITY_MODEL,
  HOSTEL_AMENITY_MODEL,
  HOSTEL_IMAGE_MODEL,
  HOSTEL_LISTING_MODEL,
  HOSTEL_MODEL,
  HOSTEL_REVIEW_MODEL,
  HOSTEL_SUBSCRIPTION_MODEL,
  HOSTEL_VERIFICATION_REQUEST_MODEL,
  INTERACTION_EVENT_MODEL,
  REFRESH_TOKEN_MODEL,
  ROOM_MODEL,
  STUDENT_PREFERENCE_MODEL,
  UNIVERSITY_MODEL,
  USER_MODEL,
} from './database.schemas';

type AnyRecord = any;
type FindArgs = {
  where?: AnyRecord;
  include?: AnyRecord;
  orderBy?: AnyRecord | AnyRecord[];
  select?: AnyRecord;
};

type WriteArgs = {
  where?: AnyRecord;
  data?: AnyRecord;
  include?: AnyRecord;
  select?: AnyRecord;
};

@Injectable()
export class DatabaseService {
  readonly user: MongoDelegate;
  readonly hostel: MongoDelegate;
  readonly hostelListing: MongoDelegate;
  readonly room: MongoDelegate;
  readonly amenity: MongoDelegate;
  readonly hostelAmenity: MongoDelegate;
  readonly interactionEvent: MongoDelegate;
  readonly refreshToken: MongoDelegate;
  readonly hostelReview: MongoDelegate;
  readonly hostelImage: MongoDelegate;
  readonly hostelVerificationRequest: MongoDelegate;
  readonly hostelSubscription: MongoDelegate;
  readonly university: MongoDelegate;
  readonly studentPreference: MongoDelegate;

  constructor(
    @InjectModel(USER_MODEL) userModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_MODEL) hostelModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_LISTING_MODEL) hostelListingModel: Model<AnyRecord>,
    @InjectModel(ROOM_MODEL) roomModel: Model<AnyRecord>,
    @InjectModel(AMENITY_MODEL) amenityModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_AMENITY_MODEL) hostelAmenityModel: Model<AnyRecord>,
    @InjectModel(INTERACTION_EVENT_MODEL) interactionEventModel: Model<AnyRecord>,
    @InjectModel(REFRESH_TOKEN_MODEL) refreshTokenModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_REVIEW_MODEL) hostelReviewModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_IMAGE_MODEL) hostelImageModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_VERIFICATION_REQUEST_MODEL) hostelVerificationRequestModel: Model<AnyRecord>,
    @InjectModel(HOSTEL_SUBSCRIPTION_MODEL) hostelSubscriptionModel: Model<AnyRecord>,
    @InjectModel(UNIVERSITY_MODEL) universityModel: Model<AnyRecord>,
    @InjectModel(STUDENT_PREFERENCE_MODEL) studentPreferenceModel: Model<AnyRecord>,
  ) {
    this.user = this.createDelegate(USER_MODEL, userModel);
    this.hostel = this.createDelegate(HOSTEL_MODEL, hostelModel);
    this.hostelListing = this.createDelegate(HOSTEL_LISTING_MODEL, hostelListingModel);
    this.room = this.createDelegate(ROOM_MODEL, roomModel);
    this.amenity = this.createDelegate(AMENITY_MODEL, amenityModel);
    this.hostelAmenity = this.createDelegate(HOSTEL_AMENITY_MODEL, hostelAmenityModel);
    this.interactionEvent = this.createDelegate(INTERACTION_EVENT_MODEL, interactionEventModel);
    this.refreshToken = this.createDelegate(REFRESH_TOKEN_MODEL, refreshTokenModel);
    this.hostelReview = this.createDelegate(HOSTEL_REVIEW_MODEL, hostelReviewModel);
    this.hostelImage = this.createDelegate(HOSTEL_IMAGE_MODEL, hostelImageModel);
    this.hostelVerificationRequest = this.createDelegate(
      HOSTEL_VERIFICATION_REQUEST_MODEL,
      hostelVerificationRequestModel,
    );
    this.hostelSubscription = this.createDelegate(HOSTEL_SUBSCRIPTION_MODEL, hostelSubscriptionModel);
    this.university = this.createDelegate(UNIVERSITY_MODEL, universityModel);
    this.studentPreference = this.createDelegate(STUDENT_PREFERENCE_MODEL, studentPreferenceModel);
  }

  async $transaction<T>(work: Promise<T>[]): Promise<T[]>;
  async $transaction<T>(work: (database: DatabaseService) => Promise<T>): Promise<T>;
  async $transaction<T>(work: Promise<T>[] | ((database: DatabaseService) => Promise<T>)): Promise<T[] | T> {
    if (Array.isArray(work)) {
      return Promise.all(work);
    }

    return work(this);
  }

  private createDelegate(modelName: string, model: Model<AnyRecord>) {
    return new MongoDelegate(
      modelName,
      model,
      (sourceModel, record, include) => this.loadRelations(sourceModel, record, include),
      (sourceModel, record, relationName, relationWhere) =>
        this.matchesRelationWhere(sourceModel, record, relationName, relationWhere),
    );
  }

  private async loadRelations(modelName: string, record: AnyRecord, include: AnyRecord): Promise<AnyRecord> {
    const shaped = { ...record };

    if (modelName === HOSTEL_MODEL) {
      if (hasInclude(include, 'owner')) {
        shaped.owner = await this.user.findFirst({ where: { id: record.ownerId } });
      }

      if (hasInclude(include, 'images')) {
        shaped.images = await this.hostelImage.findMany(this.buildChildArgs(record.id, include.images));
      }

      if (hasInclude(include, 'rooms')) {
        shaped.rooms = await this.room.findMany(this.buildChildArgs(record.id, include.rooms));
      }

      if (hasInclude(include, 'reviews')) {
        shaped.reviews = await this.hostelReview.findMany(this.buildChildArgs(record.id, include.reviews));
      }

      if (hasInclude(include, 'hostelAmenities')) {
        shaped.hostelAmenities = await this.hostelAmenity.findMany(this.buildChildArgs(record.id, include.hostelAmenities));
      }
    }

    if (modelName === HOSTEL_REVIEW_MODEL && hasInclude(include, 'user')) {
      shaped.user = await this.user.findFirst({ where: { id: record.userId } });
    }

    if (modelName === REFRESH_TOKEN_MODEL && hasInclude(include, 'user')) {
      shaped.user = await this.user.findFirst({ where: { id: record.userId } });
    }

    if (modelName === HOSTEL_IMAGE_MODEL && hasInclude(include, 'hostel')) {
      shaped.hostel = await this.hostel.findFirst({ where: { id: record.hostelId } });
    }

    if (modelName === HOSTEL_SUBSCRIPTION_MODEL && hasInclude(include, 'hostel')) {
      shaped.hostel = await this.hostel.findFirst({ where: { id: record.hostelId } });
    }

    return shaped;
  }

  private buildChildArgs(parentId: string, includeConfig: true | AnyRecord): FindArgs {
    const config = includeConfig === true ? {} : includeConfig;
    return {
      where: {
        ...(config.where ?? {}),
        hostelId: parentId,
      },
      orderBy: config.orderBy,
      select: config.select,
      include: config.include,
    };
  }

  private async matchesRelationWhere(
    modelName: string,
    record: AnyRecord,
    relationName: string,
    relationWhere: AnyRecord,
  ): Promise<boolean> {
    if (modelName === HOSTEL_MODEL && relationName === 'rooms') {
      const rooms = await this.room.findMany({ where: { hostelId: record.id } });
      return this.matchesListRelation(rooms, relationWhere, this.room);
    }

    if (modelName === HOSTEL_MODEL && relationName === 'hostelAmenities') {
      const amenities = await this.hostelAmenity.findMany({ where: { hostelId: record.id } });
      return this.matchesListRelation(amenities, relationWhere, this.hostelAmenity);
    }

    if (modelName === HOSTEL_REVIEW_MODEL && relationName === 'user') {
      const user = await this.user.findFirst({ where: { id: record.userId } });
      return user ? this.user.matchesRecord(user, relationWhere) : false;
    }

    return false;
  }

  private async matchesListRelation(records: AnyRecord[], relationWhere: AnyRecord, delegate: MongoDelegate) {
    if (relationWhere.some) {
      for (const record of records) {
        if (await delegate.matchesRecord(record, relationWhere.some)) {
          return true;
        }
      }
      return false;
    }

    if (relationWhere.none) {
      for (const record of records) {
        if (await delegate.matchesRecord(record, relationWhere.none)) {
          return false;
        }
      }
      return true;
    }

    if (relationWhere.every) {
      for (const record of records) {
        if (!(await delegate.matchesRecord(record, relationWhere.every))) {
          return false;
        }
      }
      return true;
    }

    return false;
  }
}

class MongoDelegate {
  constructor(
    private readonly modelName: string,
    private readonly model: Model<AnyRecord>,
    private readonly loadRelations: (modelName: string, record: AnyRecord, include: AnyRecord) => Promise<AnyRecord>,
    private readonly matchesRelationWhere: (
      modelName: string,
      record: AnyRecord,
      relationName: string,
      relationWhere: AnyRecord,
    ) => Promise<boolean>,
  ) {}

  async findMany(args: FindArgs = {}): Promise<AnyRecord[]> {
    const docs = await this.model.find({}).lean().exec();
    const records = docs.map((doc) => this.toPlain(doc));
    const filtered: AnyRecord[] = [];

    for (const record of records) {
      if (await this.matchesRecord(record, args.where ?? {})) {
        filtered.push(record);
      }
    }

    this.sortRecords(filtered, args.orderBy);

    const shaped: AnyRecord[] = [];
    for (const record of filtered) {
      shaped.push(await this.shapeResult(record, args));
    }

    return shaped;
  }

  async findFirst(args: FindArgs = {}): Promise<AnyRecord | null> {
    const records = await this.findMany(args);
    return records[0] ?? null;
  }

  async findUnique(args: FindArgs = {}): Promise<AnyRecord | null> {
    return this.findFirst({
      ...args,
      where: this.normalizeUniqueWhere(args.where ?? {}),
    });
  }

  async create(args: WriteArgs): Promise<AnyRecord> {
    const doc = await this.model.create(this.sanitizeData(args.data ?? {}));
    return this.shapeResult(this.toPlain(doc), args);
  }

  async createMany(args: { data: AnyRecord[] }): Promise<{ count: number }> {
    const data = (args.data ?? []).map((item) => this.sanitizeData(item));
    if (!data.length) {
      return { count: 0 };
    }

    const docs = await this.model.insertMany(data);
    return { count: docs.length };
  }

  async update(args: WriteArgs): Promise<AnyRecord | null> {
    const filter = this.normalizeUniqueWhere(args.where ?? {});
    const doc = await this.model
      .findOneAndUpdate(filter, { $set: this.sanitizeData(args.data ?? {}) }, { new: true })
      .lean()
      .exec();

    return doc ? this.shapeResult(this.toPlain(doc), args) : null;
  }

  async updateMany(args: WriteArgs): Promise<{ count: number }> {
    const records = await this.findMany({ where: args.where });
    const data = this.sanitizeData(args.data ?? {});

    for (const record of records) {
      await this.model.updateOne({ id: record.id }, { $set: data }).exec();
    }

    return { count: records.length };
  }

  async delete(args: FindArgs = {}): Promise<AnyRecord | null> {
    const filter = this.normalizeUniqueWhere(args.where ?? {});
    const doc = await this.model.findOneAndDelete(filter).lean().exec();
    return doc ? this.shapeResult(this.toPlain(doc), args) : null;
  }

  async deleteMany(args: FindArgs = {}): Promise<{ count: number }> {
    const records = await this.findMany({ where: args.where });

    for (const record of records) {
      await this.model.deleteOne({ id: record.id }).exec();
    }

    return { count: records.length };
  }

  async count(args: FindArgs = {}): Promise<number> {
    const records = await this.findMany({ where: args.where });
    return records.length;
  }

  async aggregate(args: FindArgs & { _avg?: AnyRecord; _count?: AnyRecord }): Promise<AnyRecord> {
    const records = await this.findMany({ where: args.where });
    const result: AnyRecord = {};

    if (args._avg) {
      result._avg = {};
      for (const field of Object.keys(args._avg)) {
        const values = records.map((record) => Number(record[field])).filter((value) => !Number.isNaN(value));
        result._avg[field] = values.length
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null;
      }
    }

    if (args._count) {
      result._count = { _all: records.length };
    }

    return result;
  }

  async matchesRecord(record: AnyRecord, where: AnyRecord = {}): Promise<boolean> {
    for (const [key, condition] of Object.entries(where)) {
      if (condition === undefined) {
        continue;
      }

      if (key === 'AND') {
        const conditions = Array.isArray(condition) ? condition : [condition];
        for (const item of conditions) {
          if (!(await this.matchesRecord(record, item as AnyRecord))) {
            return false;
          }
        }
        continue;
      }

      if (key === 'OR') {
        const conditions = Array.isArray(condition) ? condition : [condition];
        let matched = false;
        for (const item of conditions) {
          if (await this.matchesRecord(record, item as AnyRecord)) {
            matched = true;
            break;
          }
        }
        if (!matched) {
          return false;
        }
        continue;
      }

      if (key === 'NOT') {
        if (await this.matchesRecord(record, condition as AnyRecord)) {
          return false;
        }
        continue;
      }

      if (this.isRelationFilter(key, condition)) {
        if (!(await this.matchesRelationWhere(this.modelName, record, key, condition as AnyRecord))) {
          return false;
        }
        continue;
      }

      if (!this.matchesField(record[key], condition)) {
        return false;
      }
    }

    return true;
  }

  private async shapeResult(record: AnyRecord, args: FindArgs | WriteArgs): Promise<AnyRecord> {
    let shaped = { ...record };

    if (args.include) {
      shaped = await this.loadRelations(this.modelName, shaped, args.include);
    }

    if (args.select) {
      shaped = this.applySelect(shaped, args.select);
    }

    return shaped;
  }

  private applySelect(record: AnyRecord, select: AnyRecord): AnyRecord {
    const selected: AnyRecord = {};
    for (const [key, enabled] of Object.entries(select)) {
      if (enabled) {
        selected[key] = record[key];
      }
    }

    return selected;
  }

  private matchesField(value: unknown, condition: unknown): boolean {
    if (!isPlainObject(condition)) {
      return this.valuesEqual(value, condition);
    }

    const fieldCondition = condition as AnyRecord;

    if ('equals' in fieldCondition) {
      if (!this.valuesEqual(value, fieldCondition.equals, fieldCondition.mode === 'insensitive')) {
        return false;
      }
    }

    if ('not' in fieldCondition) {
      if (this.valuesEqual(value, fieldCondition.not)) {
        return false;
      }
    }

    if ('in' in fieldCondition) {
      const candidates = Array.isArray(fieldCondition.in) ? fieldCondition.in : [];
      if (!candidates.some((candidate) => this.valuesEqual(value, candidate))) {
        return false;
      }
    }

    if ('gte' in fieldCondition && this.compareValues(value, fieldCondition.gte) < 0) {
      return false;
    }

    if ('lte' in fieldCondition && this.compareValues(value, fieldCondition.lte) > 0) {
      return false;
    }

    if ('gt' in fieldCondition && this.compareValues(value, fieldCondition.gt) <= 0) {
      return false;
    }

    if ('lt' in fieldCondition && this.compareValues(value, fieldCondition.lt) >= 0) {
      return false;
    }

    return true;
  }

  private valuesEqual(left: unknown, right: unknown, insensitive = false): boolean {
    if (left instanceof Date || right instanceof Date) {
      return new Date(left as never).getTime() === new Date(right as never).getTime();
    }

    if (insensitive && typeof left === 'string' && typeof right === 'string') {
      return left.toLowerCase() === right.toLowerCase();
    }

    return left === right;
  }

  private compareValues(left: unknown, right: unknown): number {
    const normalize = (value: unknown) => {
      if (value instanceof Date) {
        return value.getTime();
      }

      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }

      return Number(value);
    };

    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);

    if (normalizedLeft < normalizedRight) {
      return -1;
    }

    if (normalizedLeft > normalizedRight) {
      return 1;
    }

    return 0;
  }

  private sortRecords(records: AnyRecord[], orderBy?: AnyRecord | AnyRecord[]) {
    if (!orderBy) {
      return;
    }

    const sorters = Array.isArray(orderBy) ? orderBy : [orderBy];
    records.sort((left, right) => {
      for (const sorter of sorters) {
        const [field, direction] = Object.entries(sorter)[0] ?? [];
        if (!field) {
          continue;
        }

        const comparison = this.compareValues(left[field], right[field]);
        if (comparison !== 0) {
          return direction === 'desc' ? comparison * -1 : comparison;
        }
      }

      return 0;
    });
  }

  private normalizeUniqueWhere(where: AnyRecord): AnyRecord {
    if (where.hostelId_amenityId) {
      return {
        hostelId: where.hostelId_amenityId.hostelId,
        amenityId: where.hostelId_amenityId.amenityId,
      };
    }

    return where;
  }

  private sanitizeData(value: unknown): any {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value instanceof Date) {
      return value;
    }

    if (typeof value === 'bigint') {
      return Number(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeData(item));
    }

    if (isPlainObject(value)) {
      const result: AnyRecord = {};
      for (const [key, item] of Object.entries(value)) {
        const sanitized = this.sanitizeData(item);
        if (sanitized !== undefined) {
          result[key] = sanitized;
        }
      }
      return result;
    }

    return value;
  }

  private toPlain(doc: AnyRecord): AnyRecord {
    const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
    const { _id, __v, ...plain } = raw;
    return plain;
  }

  private isRelationFilter(key: string, condition: unknown) {
    if (!isPlainObject(condition)) {
      return false;
    }

    return (
      ['rooms', 'hostelAmenities', 'user'].includes(key) &&
      ('some' in (condition as AnyRecord) ||
        'none' in (condition as AnyRecord) ||
        'every' in (condition as AnyRecord) ||
        key === 'user')
    );
  }
}

function hasInclude(include: AnyRecord, key: string): boolean {
  return include[key] !== undefined && include[key] !== false;
}

function isPlainObject(value: unknown): value is AnyRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}
