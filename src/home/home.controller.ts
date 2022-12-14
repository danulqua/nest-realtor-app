import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertyType, UserType } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator';
import { User, UserInfo } from '../user/decorators/user.decorator';
import {
  CreateHomeDto,
  HomeResponseDto,
  InquireDto,
  UpdateHomeDto,
} from './dto/home.dto';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get()
  getHomes(
    @Query('city') city?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('numberOfBedrooms') numberOfBedrooms?: string,
    @Query('numberOfBathrooms') numberOfBathrooms?: string,
    @Query('minLandSize') minLandSize?: string,
    @Query('maxLandSize') maxLandSize?: string,
    @Query('propertyType') propertyType?: PropertyType,
  ): Promise<HomeResponseDto[]> {
    const price =
      minPrice || maxPrice
        ? {
            ...(minPrice && { gte: parseFloat(minPrice) }),
            ...(maxPrice && { lte: parseFloat(maxPrice) }),
          }
        : undefined;

    const landSize =
      minLandSize || maxLandSize
        ? {
            ...(minLandSize && { gte: parseInt(minLandSize) }),
            ...(maxLandSize && { lte: parseInt(maxLandSize) }),
          }
        : undefined;

    const filters = {
      ...(city && { city }),
      ...(numberOfBedrooms && { numberOfBedrooms: parseInt(numberOfBedrooms) }),
      ...(numberOfBathrooms && {
        numberOfBathrooms: parseInt(numberOfBathrooms),
      }),
      ...(price && { price }),
      ...(landSize && { landSize }),
      ...(propertyType && { propertyType }),
    };

    return this.homeService.getHomes(filters);
  }

  @Get(':id')
  getHomeById(@Param('id', ParseIntPipe) id: number): Promise<HomeResponseDto> {
    return this.homeService.getHomeById(id);
  }

  @Roles(UserType.REALTOR)
  @Post()
  createHome(@Body() body: CreateHomeDto, @User() user: UserInfo) {
    return this.homeService.createHome(body, user.id);
  }

  @Roles(UserType.REALTOR)
  @Put(':id')
  async updateHome(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHomeDto,
    @User() user: UserInfo,
  ) {
    const realtor = await this.homeService.getRealtorByHomeId(id);

    if (realtor.id !== user.id) throw new UnauthorizedException();

    return this.homeService.updateHomeById(id, body, user.id);
  }

  @Roles(UserType.REALTOR)
  @Delete(':id')
  deleteHome(@Param('id', ParseIntPipe) id: number, @User() user: UserInfo) {
    return this.homeService.deleteHomeById(id, user.id);
  }

  @Roles(UserType.BUYER)
  @Post(':id/inquire')
  inquire(
    @Param('id', ParseIntPipe) homeId: number,
    @User() user: UserInfo,
    @Body() { message }: InquireDto,
  ) {
    return this.homeService.inquire(homeId, user, message);
  }

  @Roles(UserType.REALTOR)
  @Get(':id/messages')
  getMessagesByHome(
    @Param('id', ParseIntPipe) homeId: number,
    @User() realtor: UserInfo,
  ) {
    return this.homeService.getMessagesByHome(homeId, realtor);
  }
}
