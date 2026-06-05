import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EquipmentDocument = HydratedDocument<Equipment>;

/** A canonical piece of equipment (e.g. "barbell"). */
@Schema({ collection: 'equipments' })
export class Equipment {
  @Prop({ required: true, unique: true, index: true })
  name!: string;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
