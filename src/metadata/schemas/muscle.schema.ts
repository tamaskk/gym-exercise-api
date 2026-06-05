import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type MuscleDocument = HydratedDocument<Muscle>;

/** A canonical muscle (e.g. "pectorals"). */
@Schema({ collection: 'muscles' })
export class Muscle {
  @Prop({ required: true, unique: true, index: true })
  name!: string;
}

export const MuscleSchema = SchemaFactory.createForClass(Muscle);
