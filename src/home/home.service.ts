import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
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
}
