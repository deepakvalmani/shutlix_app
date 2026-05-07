import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Shuttle, Trip, Rating } from '../models/index';
import { Stop, Route } from '../models/Route';

dotenv.config();

const seed = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found');

    await mongoose.connect(uri);
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Shuttle.deleteMany({}),
      Trip.deleteMany({}),
      Rating.deleteMany({}),
      Stop.deleteMany({}),
      Route.deleteMany({}),
    ]);

    // 1. Create Organization
    const org = await Organization.create({
      name: 'IBA University',
      shortName: 'IBA',
      code: 'IBA001',
      contactEmail: 'admin@iba.edu.pk',
      address: 'University Road, Karachi',
      timezone: 'Asia/Karachi',
      isActive: true,
    });

    // 2. Create Users
    const admin = await User.create({
      name: 'Super Admin',
      email: 'admin@iba.edu.pk',
      password: 'AdminPassword123',
      role: 'admin',
      organizationId: org._id,
      isVerified: true,
    });

    await User.create({
      name: 'Demo Admin',
      email: 'admin@demou.edu',
      password: 'AdminPassword123',
      role: 'admin',
      organizationId: org._id,
      isVerified: true,
    });

    const driver1 = await User.create({
      name: 'John Driver',
      email: 'driver@iba.edu.pk',
      password: 'DriverPassword123',
      role: 'driver',
      organizationId: org._id,
      licenseNumber: 'KHI-12345',
      isVerified: true,
    });

    const driver2 = await User.create({
      name: 'Mike Smith',
      email: 'driver2@iba.edu.pk',
      password: 'DriverPassword123',
      role: 'driver',
      organizationId: org._id,
      licenseNumber: 'KHI-98765',
      isVerified: true,
    });

    const students = [
      { name: 'Alice Student', email: 'student@iba.edu.pk', studentId: '2023-IBA-101' },
      { name: 'Bob Smith', email: 'bob@iba.edu.pk', studentId: '2023-IBA-102' },
      { name: 'Charlie Brown', email: 'charlie@iba.edu.pk', studentId: '2023-IBA-103' },
      { name: 'Diana Prince', email: 'diana@iba.edu.pk', studentId: '2023-IBA-104' },
      { name: 'Ethan Hunt', email: 'ethan@iba.edu.pk', studentId: '2023-IBA-105' },
    ];

    for (const s of students) {
      await User.create({
        ...s,
        password: 'StudentPassword123',
        role: 'student',
        organizationId: org._id,
        isVerified: true,
      });
    }

    // 3. Create Stops (Points on Map)
    const stops = [
      { name: 'Main Gate', lat: 24.9056, lng: 67.0822 },
      { name: 'Library Block', lat: 24.9070, lng: 67.0835 },
      { name: 'Girls Hostel', lat: 24.9095, lng: 67.0810 },
      { name: 'Boys Hostel', lat: 24.9040, lng: 67.0790 },
      { name: 'Admin Block', lat: 24.9065, lng: 67.0845 },
      { name: 'Sports Complex', lat: 24.9085, lng: 67.0860 },
      { name: 'City Campus Stop', lat: 24.8683, lng: 67.0094 },
    ];

    const createdStops = [];
    for (const s of stops) {
      const stop = await Stop.create({
        organizationId: org._id,
        ...s,
      });
      createdStops.push(stop);
    }

    // 4. Create Routes
    const route1 = await Route.create({
      organizationId: org._id,
      name: 'Main Campus Loop',
      shortCode: 'L1',
      color: '#3B82F6',
      stops: [
        { stopId: createdStops[0]._id, order: 1 },
        { stopId: createdStops[1]._id, order: 2 },
        { stopId: createdStops[4]._id, order: 3 },
        { stopId: createdStops[5]._id, order: 4 },
      ],
    });

    const route2 = await Route.create({
      organizationId: org._id,
      name: 'Hostel Shuttle',
      shortCode: 'H1',
      color: '#10B981',
      stops: [
        { stopId: createdStops[2]._id, order: 1 },
        { stopId: createdStops[3]._id, order: 2 },
        { stopId: createdStops[0]._id, order: 3 },
      ],
    });

    const route3 = await Route.create({
      organizationId: org._id,
      name: 'City Connector',
      shortCode: 'C1',
      color: '#F59E0B',
      stops: [
        { stopId: createdStops[0]._id, order: 1 },
        { stopId: createdStops[6]._id, order: 2 },
      ],
    });

    // 5. Create Shuttles
    await Shuttle.create({
      organizationId: org._id,
      name: 'IBA-Bus-01',
      plateNumber: 'ABC-123',
      capacity: 30,
      status: 'idle',
    });

    await Shuttle.create({
      organizationId: org._id,
      name: 'IBA-Bus-02',
      plateNumber: 'XYZ-789',
      capacity: 40,
      status: 'idle',
    });

    console.log('✅ Seed completed successfully!');
    console.log('----------------------------');
    console.log('Admin 1: admin@iba.edu.pk / AdminPassword123');
    console.log('Admin 2: admin@demou.edu / AdminPassword123');
    console.log('Driver: driver@iba.edu.pk / DriverPassword123');
    console.log('Student: student@iba.edu.pk / StudentPassword123');
    console.log('Org Code: IBA001');
    console.log('----------------------------');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seed();
