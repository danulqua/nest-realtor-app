import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserInfo } from '../user/decorators/user.decorator';
import { HomeResponseDto } from './dto/home.dto';

interface GetHomesParams {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  landSize?: {
    gte?: number;
    lte?: number;
  };
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  propertyType?: PropertyType;
}

interface CreateHomeParams {
  address: string;
  numberOfBedrooms: number;
  numberOfBathrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}

interface UpdateHomeParams {
  address?: string;
  numberOfBedrooms?: number;
  numberOfBathrooms?: number;
  city?: string;
  price?: number;
  landSize?: number;
  propertyType?: PropertyType;
}

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(filters: GetHomesParams): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        numberOfBedrooms: true,
        numberOfBathrooms: true,
        listedDate: true,
        landSize: true,
        propertyType: true,
        images: {
          select: {
            url: true,
          },

          take: 1,
        },
      },
      where: filters,
    });

    if (!homes.length) throw new NotFoundException();

    return homes.map((home) => {
      const fetchedHome = {
        ...home,
        image: home.images[0].url,
      };

      delete fetchedHome.images;
      return new HomeResponseDto(fetchedHome);
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      select: {
        id: true,
        address: true,
        city: true,
        price: true,
        numberOfBedrooms: true,
        numberOfBathrooms: true,
        listedDate: true,
        landSize: true,
        propertyType: true,
        images: {
          select: {
            url: true,
          },
        },
      },
      where: { id },
    });

    if (!home) throw new NotFoundException();

    return new HomeResponseDto(home);
  }

  async createHome(
    {
      address,
      city,
      numberOfBedrooms,
      numberOfBathrooms,
      price,
      landSize,
      propertyType,
      images,
    }: CreateHomeParams,
    userId: number,
  ) {
    const home = await this.prismaService.home.create({
      data: {
        address,
        city,
        numberOfBedrooms,
        numberOfBathrooms,
        price,
        landSize,
        propertyType,
        realtorId: userId,
      },
    });

    const homeImages = images.map((img) => ({ ...img, homeId: home.id }));
    await this.prismaService.image.createMany({ data: homeImages });

    return new HomeResponseDto(home);
  }

  async updateHomeById(id: number, data: UpdateHomeParams, userId: number) {
    const home = await this.prismaService.home.findUnique({ where: { id } });

    if (!home) throw new NotFoundException();

    const updatedHome = await this.prismaService.home.update({
      where: { id },
      data,
    });

    return new HomeResponseDto(updatedHome);
  }

  async deleteHomeById(id: number, userId: number) {
    const home = await this.prismaService.home.findUnique({ where: { id } });

    if (!home) throw new NotFoundException();

    const realtor = await this.getRealtorByHomeId(home.id);

    if (realtor.id !== userId) throw new UnauthorizedException();

    const deletedHome = await this.prismaService.home.delete({ where: { id } });
    return new HomeResponseDto(deletedHome);
  }

  async getRealtorByHomeId(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: { realtor: true },
    });

    if (!home) throw new NotFoundException();

    return home.realtor;
  }

  async inquire(homeId: number, buyer: UserInfo, message: string) {
    const realtor = await this.getRealtorByHomeId(homeId);

    const newMessage = await this.prismaService.message.create({
      data: {
        buyerId: buyer.id,
        realtorId: realtor.id,
        homeId,
        message,
      },
    });

    return newMessage;
  }

  getMessagesByHome(id: number, realtor: UserInfo) {
    return this.prismaService.message.findMany({
      select: {
        message: true,
        buyer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },

      where: {
        homeId: id,
        realtorId: realtor.id,
      },
    });
  }
}
