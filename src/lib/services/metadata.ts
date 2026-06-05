import { Model } from 'mongoose';
import { BodyPart, Equipment, Muscle, NamedDoc } from '../models/metadata';

const clean = (names: string[]) =>
  Array.from(
    new Set(names.map((n) => String(n).trim().toLowerCase()).filter(Boolean)),
  );

async function upsertNames(model: Model<NamedDoc>, names: string[]): Promise<number> {
  const list = clean(names);
  if (!list.length) return 0;
  await model.bulkWrite(
    list.map((name) => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name } },
        upsert: true,
      },
    })),
    { ordered: false },
  );
  return list.length;
}

const names = (docs: NamedDoc[]) => docs.map((d) => ({ name: d.name }));

export const listBodyParts = async () =>
  names((await BodyPart.find().sort({ name: 1 }).lean().exec()) as NamedDoc[]);
export const listMuscles = async () =>
  names((await Muscle.find().sort({ name: 1 }).lean().exec()) as NamedDoc[]);
export const listEquipments = async () =>
  names((await Equipment.find().sort({ name: 1 }).lean().exec()) as NamedDoc[]);

export const upsertBodyParts = (n: string[]) => upsertNames(BodyPart, n);
export const upsertMuscles = (n: string[]) => upsertNames(Muscle, n);
export const upsertEquipments = (n: string[]) => upsertNames(Equipment, n);
