import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BodyPart, BodyPartSchema } from './schemas/body-part.schema';
import { Muscle, MuscleSchema } from './schemas/muscle.schema';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema';
import { MetadataController } from './metadata.controller';
import { MetadataService } from './metadata.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BodyPart.name, schema: BodyPartSchema },
      { name: Muscle.name, schema: MuscleSchema },
      { name: Equipment.name, schema: EquipmentSchema },
    ]),
  ],
  controllers: [MetadataController],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
