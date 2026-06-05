import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BodyPart, BodyPartDocument } from './schemas/body-part.schema';
import { Muscle, MuscleDocument } from './schemas/muscle.schema';
import { Equipment, EquipmentDocument } from './schemas/equipment.schema';

/**
 * Read & upsert access to the canonical metadata lists (body parts, muscles,
 * equipment). Names are stored lower-cased; upserts are idempotent on the
 * unique `name` key so re-running a sync never creates duplicates.
 */
@Injectable()
export class MetadataService {
  constructor(
    @InjectModel(BodyPart.name)
    private readonly bodyParts: Model<BodyPartDocument>,
    @InjectModel(Muscle.name)
    private readonly muscles: Model<MuscleDocument>,
    @InjectModel(Equipment.name)
    private readonly equipments: Model<EquipmentDocument>,
  ) {}

  findAllBodyParts(): Promise<BodyPart[]> {
    return this.bodyParts.find().sort({ name: 1 }).lean().exec();
  }

  findAllMuscles(): Promise<Muscle[]> {
    return this.muscles.find().sort({ name: 1 }).lean().exec();
  }

  findAllEquipments(): Promise<Equipment[]> {
    return this.equipments.find().sort({ name: 1 }).lean().exec();
  }

  upsertBodyParts(names: string[]): Promise<number> {
    return this.upsertNames(this.bodyParts, names);
  }

  upsertMuscles(names: string[]): Promise<number> {
    return this.upsertNames(this.muscles, names);
  }

  upsertEquipments(names: string[]): Promise<number> {
    return this.upsertNames(this.equipments, names);
  }

  private async upsertNames(
    model: Model<any>,
    names: string[],
  ): Promise<number> {
    const cleaned = Array.from(
      new Set(
        names.map((n) => String(n).trim().toLowerCase()).filter(Boolean),
      ),
    );
    if (!cleaned.length) return 0;
    await model.bulkWrite(
      cleaned.map((name) => ({
        updateOne: {
          filter: { name },
          update: { $setOnInsert: { name } },
          upsert: true,
        },
      })),
      { ordered: false },
    );
    return cleaned.length;
  }
}
