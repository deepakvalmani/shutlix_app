require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Shuttle = require('../models/Shuttle');
const { Route, Stop } = require('../models/Route');
const Organization = require('../models/Organization');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Shuttle.deleteMany({}),
      Route.deleteMany({}),
      Stop.deleteMany({}),
      Organization.deleteMany({}),
    ]);
    console.log('🗑️ Cleared existing data');

    // ─── CREATE ORGANIZATION ────────────────────────────────
    const organization = await Organization.create({
      name: 'Institute of Business Administration',
      shortName: 'IBA',
      code: 'IBA123',
      plan: 'growth',
      mapCenter: { lat: 24.9056, lng: 67.0822 },
      defaultMapZoom: 15,
      operatingHours: { start: '07:30', end: '22:00' },
      contactEmail: 'transport@iba.edu.pk',
      settings: {
        allowGuestTracking: true,
        enableQRCheckIn: true,
        enableRatings: true,
        maxShuttles: 15,
      },
    });
    console.log(`✅ Organization created: ${organization.name} (${organization._id})`);

    // ─── CREATE USERS ─────────────────────────────────────
    const admin = await User.create({
      name: 'Transport Admin',
      email: 'admin@iba.edu.pk',
      password: 'Admin@1234',
      role: 'admin',
      organizationId: organization._id,
    });

    const driver1 = await User.create({
      name: 'Ahmed Khan',
      email: 'driver1@iba.edu.pk',
      password: 'Driver@1234',
      role: 'driver',
      organizationId: organization._id,
      licenseNumber: 'KHI-2019-11234',
    });

    const driver2 = await User.create({
      name: 'Bilal Malik',
      email: 'driver2@iba.edu.pk',
      password: 'Driver@1234',
      role: 'driver',
      organizationId: organization._id,
      licenseNumber: 'KHI-2020-55678',
    });

    const student1 = await User.create({
      name: 'Sara Ahmed',
      email: 'student1@iba.edu.pk',
      password: 'Student@1234',
      role: 'student',
      organizationId: organization._id,
      studentId: 'IBA-2021-001',
    });

    const student2 = await User.create({
      name: 'Hamza Raza',
      email: 'student2@iba.edu.pk',
      password: 'Student@1234',
      role: 'student',
      organizationId: organization._id,
      studentId: 'IBA-2022-045',
    });

    console.log('✅ Users created (admin, 2 drivers, 2 students)');

    // ─── CREATE SHUTTLES ──────────────────────────────────
    const shuttle1 = await Shuttle.create({
      organizationId: organization._id,
      name: 'Shuttle A',
      plateNumber: 'KHI-1234',
      capacity: 30,
      make: 'Toyota',
      model: 'Hiace',
      year: 2020,
      color: 'White',
      currentDriverId: driver1._id,
    });

    const shuttle2 = await Shuttle.create({
      organizationId: organization._id,
      name: 'Shuttle B',
      plateNumber: 'KHI-5678',
      capacity: 25,
      make: 'Toyota',
      model: 'Coaster',
      year: 2019,
      color: 'Blue',
      currentDriverId: driver2._id,
    });

    const shuttle3 = await Shuttle.create({
      organizationId: organization._id,
      name: 'Shuttle C',
      plateNumber: 'KHI-9012',
      capacity: 40,
      make: 'Hino',
      model: 'Bus',
      year: 2021,
      color: 'Yellow',
    });

    console.log('✅ Shuttles created (3)');

    // ─── UPDATE DRIVERS WITH SHUTTLE ASSIGNMENTS ──────────
    await User.findByIdAndUpdate(driver1._id, { assignedShuttleId: shuttle1._id });
    await User.findByIdAndUpdate(driver2._id, { assignedShuttleId: shuttle2._id });

    // ─── CREATE STOPS ─────────────────────────────────────
    const stopData = [
      { name: 'Main Gate', lat: 24.9056, lng: 67.0822, order: 1 },
      { name: 'Library Block', lat: 24.9068, lng: 67.0835, order: 2 },
      { name: 'CS Department', lat: 24.9080, lng: 67.0848, order: 3 },
      { name: 'Sports Complex', lat: 24.9045, lng: 67.0860, order: 4 },
      { name: 'Hostel Area', lat: 24.9030, lng: 67.0875, order: 5 },
      { name: 'Cafeteria', lat: 24.9060, lng: 67.0810, order: 6 },
      { name: 'Admin Block', lat: 24.9072, lng: 67.0800, order: 7 },
      { name: 'Engineering Block', lat: 24.9090, lng: 67.0830, order: 8 },
    ];

    const stops = await Stop.insertMany(
      stopData.map(s => ({
        organizationId: organization._id,
        name: s.name,
        lat: s.lat,
        lng: s.lng,
        location: { type: 'Point', coordinates: [s.lng, s.lat] },
        order: s.order,
        isActive: true,
        facilities: ['shelter', 'bench'],
      }))
    );
    console.log(`✅ Stops created (${stops.length})`);

    // ─── CREATE ROUTES ────────────────────────────────────
    const routeA = await Route.create({
      organizationId: organization._id,
      name: 'Main Campus Loop',
      shortCode: 'A',
      color: '#1A56DB',
      stops: [
        { stopId: stops[0]._id, order: 1, estimatedMinutesFromStart: 0 },
        { stopId: stops[1]._id, order: 2, estimatedMinutesFromStart: 3 },
        { stopId: stops[2]._id, order: 3, estimatedMinutesFromStart: 6 },
        { stopId: stops[5]._id, order: 4, estimatedMinutesFromStart: 9 },
        { stopId: stops[6]._id, order: 5, estimatedMinutesFromStart: 12 },
        { stopId: stops[0]._id, order: 6, estimatedMinutesFromStart: 15 },
      ],
      pathCoordinates: stopData.slice(0, 5).map(s => ({ lat: s.lat, lng: s.lng })),
      isActive: true,
      isCircular: true,
      estimatedTotalMinutes: 15,
      schedule: [
        { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '08:00', endTime: '20:00', frequency: 20 },
      ],
      assignedShuttles: [shuttle1._id],
    });

    const routeB = await Route.create({
      organizationId: organization._id,
      name: 'Hostel Express',
      shortCode: 'B',
      color: '#D97706',
      stops: [
        { stopId: stops[0]._id, order: 1, estimatedMinutesFromStart: 0 },
        { stopId: stops[3]._id, order: 2, estimatedMinutesFromStart: 5 },
        { stopId: stops[4]._id, order: 3, estimatedMinutesFromStart: 10 },
      ],
      pathCoordinates: [stops[0], stops[3], stops[4]].map(s => ({ lat: s.lat, lng: s.lng })),
      isActive: true,
      isCircular: false,
      estimatedTotalMinutes: 10,
      schedule: [
        { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], startTime: '07:30', endTime: '22:00', frequency: 30 },
      ],
      assignedShuttles: [shuttle2._id],
    });

    // Link routes back to shuttles
    await Shuttle.findByIdAndUpdate(shuttle1._id, { assignedRouteId: routeA._id });
    await Shuttle.findByIdAndUpdate(shuttle2._id, { assignedRouteId: routeB._id });

    console.log('✅ Routes created (Route A & B)');

    // ─── SUMMARY ──────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Seed complete! Login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Organization ID: ${organization._id}`);
    console.log(`Organization Code: ${organization.code}`);
    console.log('');
    console.log('Admin:   admin@iba.edu.pk    / Admin@1234');
    console.log('Driver1: driver1@iba.edu.pk  / Driver@1234');
    console.log('Driver2: driver2@iba.edu.pk  / Driver@1234');
    console.log('Student: student1@iba.edu.pk / Student@1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

seed();