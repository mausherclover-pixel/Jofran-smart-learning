import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthContext } from '../common/types/auth-context';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsService } from './schools.service';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  create(@Body() dto: CreateSchoolDto) {
    return this.schools.create(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  listAll() {
    return this.schools.listAll();
  }

  @Get(':id')
  findOne(@CurrentUser() ctx: AuthContext, @Param('id') id: string) {
    return this.schools.findOne(ctx, id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN)
  update(@CurrentUser() ctx: AuthContext, @Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schools.update(ctx, id, dto);
  }

  @Patch(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  suspend(@Param('id') id: string) {
    return this.schools.suspend(id);
  }
}
