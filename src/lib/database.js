// IndexedDB database management for food and exercise libraries
class HealthDatabase {
  constructor() {
    this.dbName = 'HealthTrackerDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create food library store
        if (!db.objectStoreNames.contains('foodLibrary')) {
          const foodStore = db.createObjectStore('foodLibrary', { keyPath: 'id', autoIncrement: true });
          foodStore.createIndex('name', 'name', { unique: false });
          foodStore.createIndex('category', 'category', { unique: false });
          foodStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        // Create exercise library store
        if (!db.objectStoreNames.contains('exerciseLibrary')) {
          const exerciseStore = db.createObjectStore('exerciseLibrary', { keyPath: 'id', autoIncrement: true });
          exerciseStore.createIndex('name', 'name', { unique: false });
          exerciseStore.createIndex('category', 'category', { unique: false });
          exerciseStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        // Create user entries store (migrated from localStorage)
        if (!db.objectStoreNames.contains('userEntries')) {
          const entriesStore = db.createObjectStore('userEntries', { keyPath: 'id', autoIncrement: true });
          entriesStore.createIndex('date', 'date', { unique: false });
          entriesStore.createIndex('type', 'type', { unique: false });
        }

        // Create measurements store
        if (!db.objectStoreNames.contains('measurements')) {
          const measurementsStore = db.createObjectStore('measurements', { keyPath: 'id', autoIncrement: true });
          measurementsStore.createIndex('date', 'date', { unique: false });
        }
      };
    });
  }

  // Food Library Methods
  async addFoodItem(foodItem) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['foodLibrary'], 'readwrite');
      const store = transaction.objectStore('foodLibrary');
      foodItem.lastUsed = new Date();
      
      const request = store.add(foodItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFoodItems(searchTerm = '', limit = 50) {
    const transaction = this.db.transaction(['foodLibrary'], 'readonly');
    const store = transaction.objectStore('foodLibrary');
    const index = store.index('lastUsed');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const item = cursor.value;
          if (!searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push(item);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateFoodItem(id, updates) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['foodLibrary'], 'readwrite');
      const store = transaction.objectStore('foodLibrary');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          Object.assign(item, updates);
          item.lastUsed = new Date();
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Food item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getFoodItem(id) {
    const transaction = this.db.transaction(['foodLibrary'], 'readonly');
    const store = transaction.objectStore('foodLibrary');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFoodItem(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['foodLibrary'], 'readwrite');
      const store = transaction.objectStore('foodLibrary');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Exercise Library Methods
  async addExerciseItem(exerciseItem) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['exerciseLibrary'], 'readwrite');
      const store = transaction.objectStore('exerciseLibrary');
      exerciseItem.lastUsed = new Date();
      
      const request = store.add(exerciseItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getExerciseItems(searchTerm = '', limit = 50) {
    const transaction = this.db.transaction(['exerciseLibrary'], 'readonly');
    const store = transaction.objectStore('exerciseLibrary');
    const index = store.index('lastUsed');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev');
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const item = cursor.value;
          if (!searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
            results.push(item);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async updateExerciseItem(id, updates) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['exerciseLibrary'], 'readwrite');
      const store = transaction.objectStore('exerciseLibrary');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          Object.assign(item, updates);
          item.lastUsed = new Date();
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Exercise item not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getExerciseItem(id) {
    const transaction = this.db.transaction(['exerciseLibrary'], 'readonly');
    const store = transaction.objectStore('exerciseLibrary');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExerciseItem(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['exerciseLibrary'], 'readwrite');
      const store = transaction.objectStore('exerciseLibrary');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // User Entries Methods
  async saveUserEntry(entry) {
    const transaction = this.db.transaction(['userEntries'], 'readwrite');
    const store = transaction.objectStore('userEntries');
    return store.add(entry);
  }

  async getUserEntries(date) {
    const transaction = this.db.transaction(['userEntries'], 'readonly');
    const store = transaction.objectStore('userEntries');
    const index = store.index('date');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUserEntries() {
    const transaction = this.db.transaction(['userEntries'], 'readonly');
    const store = transaction.objectStore('userEntries');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUserEntry(id) {
    const transaction = this.db.transaction(['userEntries'], 'readwrite');
    const store = transaction.objectStore('userEntries');
    return store.delete(id);
  }

  // Measurements Methods
  async saveMeasurement(measurement) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['measurements'], 'readwrite');
      const store = transaction.objectStore('measurements');
      
      const request = store.add(measurement);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMeasurements(date) {
    const transaction = this.db.transaction(['measurements'], 'readonly');
    const store = transaction.objectStore('measurements');
    const index = store.index('date');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(date);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllMeasurements() {
    const transaction = this.db.transaction(['measurements'], 'readonly');
    const store = transaction.objectStore('measurements');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMeasurement(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['measurements'], 'readwrite');
      const store = transaction.objectStore('measurements');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Migration from localStorage
  async migrateFromLocalStorage() {
    try {
      const existingData = localStorage.getItem('healthEntries');
      if (existingData) {
        const parsed = JSON.parse(existingData);
        const entries = [];
        
        Object.keys(parsed).forEach(dateKey => {
          parsed[dateKey].forEach(entry => {
            entries.push({
              ...entry,
              date: new Date(entry.date).toISOString(),
              id: entry.id || Date.now() + Math.random()
            });
          });
        });

        // Save all entries to IndexedDB
        for (const entry of entries) {
          await this.saveUserEntry(entry);
        }

        // Clear localStorage after successful migration
        localStorage.removeItem('healthEntries');
        localStorage.removeItem('mealEntries');
        
        console.log('Successfully migrated data from localStorage to IndexedDB');
        return true;
      }
    } catch (error) {
      console.error('Error migrating from localStorage:', error);
      return false;
    }
    return false;
  }

  // Generic methods for LibraryManager
  async addItem(type, item) {
    return type === 'food' ? this.addFoodItem(item) : this.addExerciseItem(item);
  }

  async getItem(type, id) {
    return type === 'food' ? this.getFoodItem(id) : this.getExerciseItem(id);
  }

  async updateItem(type, id, updates) {
    return type === 'food' ? this.updateFoodItem(id, updates) : this.updateExerciseItem(id, updates);
  }

  async deleteItem(type, id) {
    return type === 'food' ? this.deleteFoodItem(id) : this.deleteExerciseItem(id);
  }

  // Initialize with sample data
  async initializeSampleData() {
    const foodItems = [
      { name: 'Breakfast', category: 'Meal', description: 'Morning meal' },
      { name: 'Lunch', category: 'Meal', description: 'Midday meal' },
      { name: 'Dinner', category: 'Meal', description: 'Evening meal' },
      { name: 'Snack', category: 'Meal', description: 'Light snack' },
      { name: 'Apple', category: 'Fruit', description: 'Fresh apple' },
      { name: 'Banana', category: 'Fruit', description: 'Fresh banana' },
      { name: 'Chicken Breast', category: 'Protein', description: 'Grilled chicken breast' },
      { name: 'Salmon', category: 'Protein', description: 'Baked salmon' },
      { name: 'Rice', category: 'Carbohydrate', description: 'White rice' },
      { name: 'Oatmeal', category: 'Carbohydrate', description: 'Steel-cut oats' },
      { name: 'Greek Yogurt', category: 'Dairy', description: 'Plain Greek yogurt' },
      { name: 'Almonds', category: 'Nuts', description: 'Raw almonds' }
    ];

    const exerciseItems = [
      { name: 'Push-ups', category: 'Bodyweight', description: 'Upper body exercise', defaultSets: 3, defaultReps: 10 },
      { name: 'Squats', category: 'Bodyweight', description: 'Lower body exercise', defaultSets: 3, defaultReps: 15 },
      { name: 'Plank', category: 'Core', description: 'Core strengthening', defaultSets: 3, defaultReps: 30 },
      { name: 'Bench Press', category: 'Weight Training', description: 'Chest exercise', defaultSets: 3, defaultReps: 8 },
      { name: 'Deadlift', category: 'Weight Training', description: 'Full body exercise', defaultSets: 3, defaultReps: 5 },
      { name: 'Pull-ups', category: 'Bodyweight', description: 'Back exercise', defaultSets: 3, defaultReps: 8 },
      { name: 'Running', category: 'Cardio', description: 'Cardiovascular exercise', defaultSets: 1, defaultReps: 30 },
      { name: 'Cycling', category: 'Cardio', description: 'Low-impact cardio', defaultSets: 1, defaultReps: 45 },
      { name: 'Yoga', category: 'Flexibility', description: 'Mind-body practice', defaultSets: 1, defaultReps: 60 },
      { name: 'Swimming', category: 'Cardio', description: 'Full body workout', defaultSets: 1, defaultReps: 30 }
    ];

    // Check if data already exists
    const existingFood = await this.getFoodItems('', 1);
    const existingExercise = await this.getExerciseItems('', 1);

    if (existingFood.length === 0) {
      for (const item of foodItems) {
        await this.addFoodItem(item);
      }
    }

    if (existingExercise.length === 0) {
      for (const item of exerciseItems) {
        await this.addExerciseItem(item);
      }
    }
  }
}

// Create singleton instance
const healthDB = new HealthDatabase();

export default healthDB;

