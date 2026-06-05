import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BodyPartDocument = HydratedDocument<BodyPart>;

/** A canonical body part (e.g. "chest"). `name` is the unique natural key. */
@Schema({ collection: 'body_parts' })
export class BodyPart {
  @Prop({ required: true, unique: true, index: true })
  name!: string;
}

export const BodyPartSchema = SchemaFactory.createForClass(BodyPart);
