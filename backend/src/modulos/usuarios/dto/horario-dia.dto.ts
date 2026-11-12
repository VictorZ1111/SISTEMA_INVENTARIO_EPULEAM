import { IsBoolean, IsInt, Matches, Max, Min } from "class-validator";
export class HorarioDiaDto {
  @IsInt() @Min(1) @Max(7)
  dia!: number;
  @IsBoolean()
  activo!: boolean;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  desde!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  hasta!: string;
}
