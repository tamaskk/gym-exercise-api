import mongoose, { InferSchemaType, Model, Schema } from 'mongoose';

/** Generic `{ name }` schema shared by the three metadata collections. */
function namedSchema(collection: string) {
  return new Schema(
    { name: { type: String, required: true, unique: true, index: true } },
    { collection },
  );
}

const BodyPartSchema = namedSchema('body_parts');
const MuscleSchema = namedSchema('muscles');
const EquipmentSchema = namedSchema('equipments');

export type NamedDoc = InferSchemaType<typeof BodyPartSchema>;

export const BodyPart: Model<NamedDoc> =
  (mongoose.models.BodyPart as Model<NamedDoc>) ||
  mongoose.model<NamedDoc>('BodyPart', BodyPartSchema);

export const Muscle: Model<NamedDoc> =
  (mongoose.models.Muscle as Model<NamedDoc>) ||
  mongoose.model<NamedDoc>('Muscle', MuscleSchema);

export const Equipment: Model<NamedDoc> =
  (mongoose.models.Equipment as Model<NamedDoc>) ||
  mongoose.model<NamedDoc>('Equipment', EquipmentSchema);
