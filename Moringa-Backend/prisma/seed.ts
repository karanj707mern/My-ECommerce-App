import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const adminEmail1 = process.env.ADMIN_EMAIL_1?.trim().toLowerCase();
  const adminEmail2 = process.env.ADMIN_EMAIL_2?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail1 || !adminEmail2 || !adminPassword) {
    console.error(
      'Missing required admin environment variables: ADMIN_EMAIL_1, ADMIN_EMAIL_2, ADMIN_PASSWORD',
    );
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const products = [
    {
      name: 'Moringa Powder',
      slug: 'moringa-powder',
      sku: 'MOR-PWD-001',
      price: 1499,
      description: 'Daily greens for smoothies and tea',
      image: '/uploads/products/moringa-powder.webp',
      stock: 120,
    },
    {
      name: 'Moringa Capsules',
      slug: 'moringa-capsules',
      sku: 'MOR-CAP-001',
      price: 1999,
      description: 'Easy wellness support on busy days',
      image: '/uploads/products/moringa-capsules.webp',
      stock: 95,
    },
    {
      name: 'Moringa Tea',
      slug: 'moringa-tea',
      sku: 'MOR-TEA-001',
      price: 1249,
      description: 'Light, earthy tea for calm mornings',
      image: '/uploads/products/moringa-tea.webp',
      stock: 140,
    },
    {
      name: 'Moringa Oil',
      slug: 'moringa-oil',
      sku: 'MOR-OIL-001',
      price: 2399,
      description: 'Nourishing skin and hair care essential',
      image: '/uploads/products/moringa-oil.webp',
      stock: 80,
    },
    {
      name: 'Moringa Energy Bites',
      slug: 'moringa-energy-bites',
      sku: 'MOR-ENB-001',
      price: 899,
      description: 'Snackable nutrition for travel and office hours',
      image: '/uploads/products/moringa-energy-bites.webp',
      stock: 160,
    },
    {
      name: 'Moringa Face Mask',
      slug: 'moringa-face-mask',
      sku: 'MOR-MSK-001',
      price: 1299,
      description: 'A botanical glow treatment for weekly skin care',
      image: '/uploads/products/moringa-face-mask.webp',
      stock: 70,
    },
    {
      name: 'Moringa Seeds',
      slug: 'moringa-seeds',
      sku: 'MOR-SED-001',
      price: 749,
      description: 'Crunchy roasted seeds with a clean earthy finish',
      image: '/uploads/products/moringa-seeds.webp',
      stock: 180,
    },
    {
      name: 'Moringa Wellness Combo',
      slug: 'moringa-wellness-combo',
      sku: 'MOR-COM-001',
      price: 3499,
      description: 'A starter bundle with tea, powder, and capsules',
      image: '/uploads/products/moringa-wellness-combo.webp',
      stock: 50,
    },
  ];

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail1 },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: ' Admin Karan Patel',
        email: adminEmail1,
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
        phoneNumber: '9033227627',
        addressLine1: 'Gota',
        addressLine2: 'Floor 3',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '382481',
        country: 'India',
      },
    });
  } else if (adminUser.email !== adminEmail1) {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { email: adminEmail1 },
    });
  }

  const existingAddress = await prisma.userAddress.findFirst({
    where: { userId: adminUser.id, isDefault: true },
  });

  if (!existingAddress) {
    await prisma.userAddress.create({
      data: {
        userId: adminUser.id,
        label: 'Admin Karan',
        recipientName: 'Karan Patel',
        phoneNumber: '9033227627',
        addressLine1: 'Gota',
        addressLine2: 'Floor 3',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '382481',
        country: 'India',
        isDefault: true,
      },
    });
  }

  let secondAdminUser = await prisma.user.findUnique({
    where: { email: adminEmail2 },
  });

  if (!secondAdminUser) {
    secondAdminUser = await prisma.user.create({
      data: {
        name: 'Admin Bansi Patel',
        email: adminEmail2,
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
        phoneNumber: '',
        addressLine1: 'Gota',
        addressLine2: 'Floor 3',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '382481',
        country: 'India',
      },
    });
  } else if (secondAdminUser.email !== adminEmail2) {
    await prisma.user.update({
      where: { id: secondAdminUser.id },
      data: { email: adminEmail2 },
    });
  }

  const secondAdminAddress = await prisma.userAddress.findFirst({
    where: { userId: secondAdminUser.id, isDefault: true },
  });

  if (secondAdminAddress) {
    await prisma.userAddress.update({
      where: { id: secondAdminAddress.id },
      data: {
        label: 'Admin Bansi',
        recipientName: 'Bansi Patel',
        phoneNumber: '',
        addressLine1: 'Gota',
        addressLine2: 'Floor 3',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '382481',
        country: 'India',
        isDefault: true,
      },
    });
  } else {
    await prisma.userAddress.create({
      data: {
        userId: secondAdminUser.id,
        label: 'Admin Bansi',
        recipientName: 'Bansi Patel',
        phoneNumber: '',
        addressLine1: 'Gota',
        addressLine2: 'Floor 3',
        city: 'Ahmedabad',
        state: 'Gujarat',
        postalCode: '382481',
        country: 'India',
        isDefault: true,
      },
    });
  }

  await prisma.cartItem.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: products,
  });

  await prisma.storeSettings.upsert({
    where: { id: 1 },
    update: {
      shippingCharge: 99,
      expressShippingCharge: 149,
      sameDayShippingCharge: 249,
      codCharge: 25,
      handlingCharge: 20,
      taxRate: 0,
      freeShippingThreshold: 1500,
      shippingOptions: [
        { key: 'standard', label: 'Standard Delivery', amount: 99, etaDays: 4 },
        { key: 'express', label: 'Express Delivery', amount: 149, etaDays: 2 },
        { key: 'sameDay', label: 'Same Day Delivery', amount: 249, etaDays: 1 },
      ],
    },
    create: {
      id: 1,
      shippingCharge: 99,
      expressShippingCharge: 149,
      sameDayShippingCharge: 249,
      codCharge: 25,
      handlingCharge: 20,
      taxRate: 0,
      freeShippingThreshold: 1500,
      shippingOptions: [
        { key: 'standard', label: 'Standard Delivery', amount: 99, etaDays: 4 },
        { key: 'express', label: 'Express Delivery', amount: 149, etaDays: 2 },
        { key: 'sameDay', label: 'Same Day Delivery', amount: 249, etaDays: 1 },
      ],
    },
  });
  console.log('Admin and products seeded');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
