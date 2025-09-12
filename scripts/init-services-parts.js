const { MongoClient } = require("mongodb");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const username = process.env.MongoUsername;
const password = process.env.MongoPassword;
const cluster = process.env.cluster;
const dbName = process.env.dbName;
const authSource = process.env.authSource;
const authMechanism = process.env.authMechanism;

const localuri = process.env.MONGODB_URI;
const uri = localuri || `mongodb+srv://${username}:${password}@${cluster}/${dbName}?retryWrites=true&w=majority&authSource=${authSource}&authMechanism=${authMechanism}`;

// Default services to initialize
const defaultServices = [
  { name: "Oil Change", category: "Maintenance", estimatedDuration: 30, defaultPrice: 1500 },
  { name: "AC Service", category: "AC Service", estimatedDuration: 60, defaultPrice: 3000 },
  { name: "AC Gas Refill", category: "AC Service", estimatedDuration: 45, defaultPrice: 2500 },
  { name: "Tire Rotation", category: "Maintenance", estimatedDuration: 20, defaultPrice: 800 },
  { name: "Brake Inspection", category: "Safety", estimatedDuration: 30, defaultPrice: 1000 },
  { name: "Battery Check", category: "Electrical", estimatedDuration: 15, defaultPrice: 500 },
  { name: "Wheel Alignment", category: "Maintenance", estimatedDuration: 45, defaultPrice: 2000 },
  { name: "AC Compressor Repair", category: "AC Service", estimatedDuration: 120, defaultPrice: 5000 },
  { name: "AC Coil Cleaning", category: "AC Service", estimatedDuration: 40, defaultPrice: 1500 },
  { name: "Engine Diagnostics", category: "Diagnostics", estimatedDuration: 30, defaultPrice: 1500 },
  { name: "Transmission Service", category: "Maintenance", estimatedDuration: 60, defaultPrice: 3500 },
  { name: "Coolant Flush", category: "Maintenance", estimatedDuration: 30, defaultPrice: 1200 },
];

// Default parts to initialize
const defaultParts = [
  { name: "Battery", brand: "Bosch", category: "Electrical", defaultPrice: 5000 },
  { name: "Battery", brand: "Exide", category: "Electrical", defaultPrice: 4500 },
  { name: "Battery", brand: "Amaron", category: "Electrical", defaultPrice: 4800 },
  { name: "Brake Pads", brand: "Bosch", category: "Brakes", defaultPrice: 2500 },
  { name: "Brake Pads", brand: "Bendix", category: "Brakes", defaultPrice: 2200 },
  { name: "Engine Oil", brand: "Castrol", category: "Fluids", defaultPrice: 1200 },
  { name: "Engine Oil", brand: "Mobil", category: "Fluids", defaultPrice: 1300 },
  { name: "Engine Oil", brand: "Shell", category: "Fluids", defaultPrice: 1250 },
  { name: "Air Filter", brand: "Bosch", category: "Filters", defaultPrice: 800 },
  { name: "Air Filter", brand: "K&N", category: "Filters", defaultPrice: 1200 },
  { name: "Oil Filter", brand: "Bosch", category: "Filters", defaultPrice: 500 },
  { name: "Oil Filter", brand: "Mann", category: "Filters", defaultPrice: 450 },
  { name: "Cabin Filter", brand: "Bosch", category: "Filters", defaultPrice: 900 },
  { name: "Wiper Blades", brand: "Bosch", category: "Accessories", defaultPrice: 600 },
  { name: "Wiper Blades", brand: "Denso", category: "Accessories", defaultPrice: 550 },
  { name: "AC Compressor", brand: "Denso", category: "AC Parts", defaultPrice: 15000 },
  { name: "AC Compressor", brand: "Sanden", category: "AC Parts", defaultPrice: 14000 },
  { name: "AC Gas (R134a)", brand: "DuPont", category: "AC Parts", defaultPrice: 2000 },
  { name: "AC Coil", brand: "Denso", category: "AC Parts", defaultPrice: 8000 },
  { name: "Spark Plugs", brand: "NGK", category: "Engine", defaultPrice: 300 },
  { name: "Spark Plugs", brand: "Bosch", category: "Engine", defaultPrice: 350 },
  { name: "Brake Fluid", brand: "Castrol", category: "Fluids", defaultPrice: 600 },
  { name: "Coolant", brand: "Shell", category: "Fluids", defaultPrice: 500 },
  { name: "Transmission Fluid", brand: "Castrol", category: "Fluids", defaultPrice: 800 },
];

async function initializeServicesAndParts() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(dbName);
    const servicesCollection = db.collection("customServices");
    const partsCollection = db.collection("customParts");

    // Check if collections already have data
    const existingServicesCount = await servicesCollection.countDocuments();
    const existingPartsCount = await partsCollection.countDocuments();

    if (existingServicesCount > 0) {
      console.log(`Services collection already has ${existingServicesCount} documents. Skipping initialization.`);
    } else {
      // Initialize services
      const servicesWithMetadata = defaultServices.map(service => ({
        ...service,
        serviceId: uuidv4(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      }));

      const servicesResult = await servicesCollection.insertMany(servicesWithMetadata);
      console.log(`Initialized ${servicesResult.insertedCount} default services`);
    }

    if (existingPartsCount > 0) {
      console.log(`Parts collection already has ${existingPartsCount} documents. Skipping initialization.`);
    } else {
      // Initialize parts
      const partsWithMetadata = defaultParts.map(part => ({
        ...part,
        partId: uuidv4(),
        stockQuantity: Math.floor(Math.random() * 20) + 5, // Random stock between 5-25
        minStockLevel: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
      }));

      const partsResult = await partsCollection.insertMany(partsWithMetadata);
      console.log(`Initialized ${partsResult.insertedCount} default parts`);
    }

    console.log("Services and parts initialization complete!");

  } catch (error) {
    console.error("Error initializing services and parts:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the initialization
initializeServicesAndParts();