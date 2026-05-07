import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Organization } from '../server/models/index';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing from environment variables');
  process.exit(1);
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('connected to database');

    // 1. Clean existing users and org to ensure correct passwords
    await User.deleteMany({ email: { $in: [
      'superadmin@shuttlix.com', 
      'admin@iba.edu.pk', 
      'driver@iba.edu.pk', 
      'student@iba.edu.pk',
      'admin@demou.edu',
      'driver@demou.edu',
      'student@demou.edu'
    ] } });
    
    // 2. Create/Find Organization
    let org = await Organization.findOne({ code: 'IBAUNI' });
    if (!org) {
      org = await Organization.create({
        name: 'Institute of Business Administration (IBA) Karachi',
        shortName: 'IBA',
        code: 'IBAUNI',
        plan: 'growth',
        subscriptionStatus: 'active',
        contactEmail: 'admin@iba.edu.pk',
        mapCenter: { lat: 24.9440, lng: 67.1145 }, // IBA Main Campus (KU)
        settings: {
          maxShuttles: 50
        }
      });
      console.log('IBA Organization created');
    }

    const password = 'shuttlix@123';

    // 2. Create Users
    const usersToCreate = [
      {
        name: 'System Super Admin',
        email: 'superadmin@shuttlix.com',
        password,
        role: 'superadmin',
        isVerified: true
      },
      {
        name: 'IBA Admin',
        email: 'admin@iba.edu.pk',
        password,
        role: 'admin',
        organizationId: org._id,
        isVerified: true
      },
      {
        name: 'IBA Driver One',
        email: 'driver@iba.edu.pk',
        password,
        role: 'driver',
        organizationId: org._id,
        isVerified: true,
        phone: '+923001234567',
        licenseNumber: 'KHI-IBA-001'
      },
      {
        name: 'IBA Student Member',
        email: 'student@iba.edu.pk',
        password,
        role: 'student',
        organizationId: org._id,
        isVerified: true,
        studentId: 'ERP-2026-IBA'
      }
    ];

    for (const userData of usersToCreate) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        await User.create(userData);
        console.log(`User created: ${userData.email} (${userData.role})`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    }

    console.log('\nSeeding completed successfully!');
    console.log(`Login credentials (Password: ${password}):`);
    console.log('-----------------------------------');
    usersToCreate.forEach(u => console.log(`${u.role.toUpperCase()}: ${u.email}`));

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
