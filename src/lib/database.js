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
      // Complete Meals
      { name: 'Breakfast', category: 'Meal', description: 'Morning meal', calories: 400, protein: 20, carbs: 45, fats: 15 },
      { name: 'Lunch', category: 'Meal', description: 'Midday meal', calories: 600, protein: 35, carbs: 60, fats: 20 },
      { name: 'Dinner', category: 'Meal', description: 'Evening meal', calories: 700, protein: 40, carbs: 55, fats: 25 },
      { name: 'Snack', category: 'Meal', description: 'Light snack', calories: 150, protein: 5, carbs: 20, fats: 5 },
      
      // Fruits
      { name: 'Apple', category: 'Fruit', description: 'Fresh apple', calories: 80, protein: 0, carbs: 21, fats: 0 },
      { name: 'Banana', category: 'Fruit', description: 'Fresh banana', calories: 105, protein: 1, carbs: 27, fats: 0 },
      { name: 'Orange', category: 'Fruit', description: 'Fresh orange', calories: 62, protein: 1, carbs: 15, fats: 0 },
      { name: 'Strawberries', category: 'Fruit', description: 'Fresh strawberries', calories: 50, protein: 1, carbs: 12, fats: 0 },
      { name: 'Blueberries', category: 'Fruit', description: 'Fresh blueberries', calories: 84, protein: 1, carbs: 21, fats: 0 },
      
      // Proteins
      { name: 'Chicken Breast', category: 'Protein', description: 'Grilled chicken breast', calories: 165, protein: 31, carbs: 0, fats: 4 },
      { name: 'Salmon', category: 'Protein', description: 'Baked salmon', calories: 206, protein: 22, carbs: 0, fats: 12 },
      { name: 'Eggs', category: 'Protein', description: 'Large eggs', calories: 70, protein: 6, carbs: 0, fats: 5 },
      { name: 'Greek Yogurt', category: 'Protein', description: 'Plain Greek yogurt', calories: 100, protein: 17, carbs: 6, fats: 0 },
      { name: 'Tofu', category: 'Protein', description: 'Firm tofu', calories: 76, protein: 8, carbs: 2, fats: 4 },
      { name: 'Ground Turkey', category: 'Protein', description: 'Lean ground turkey', calories: 189, protein: 22, carbs: 0, fats: 10 },
      
      // Carbohydrates
      { name: 'Rice', category: 'Carbohydrate', description: 'White rice', calories: 130, protein: 3, carbs: 28, fats: 0 },
      { name: 'Oatmeal', category: 'Carbohydrate', description: 'Steel-cut oats', calories: 150, protein: 5, carbs: 27, fats: 3 },
      { name: 'Quinoa', category: 'Carbohydrate', description: 'Cooked quinoa', calories: 120, protein: 4, carbs: 22, fats: 2 },
      { name: 'Sweet Potato', category: 'Carbohydrate', description: 'Baked sweet potato', calories: 112, protein: 2, carbs: 26, fats: 0 },
      { name: 'Brown Rice', category: 'Carbohydrate', description: 'Brown rice', calories: 111, protein: 3, carbs: 23, fats: 1 },
      
      // Vegetables
      { name: 'Broccoli', category: 'Vegetable', description: 'Steamed broccoli', calories: 55, protein: 4, carbs: 11, fats: 1 },
      { name: 'Spinach', category: 'Vegetable', description: 'Fresh spinach', calories: 23, protein: 3, carbs: 4, fats: 0 },
      { name: 'Carrots', category: 'Vegetable', description: 'Raw carrots', calories: 25, protein: 1, carbs: 6, fats: 0 },
      { name: 'Bell Peppers', category: 'Vegetable', description: 'Mixed bell peppers', calories: 31, protein: 1, carbs: 7, fats: 0 },
      
      // Nuts & Seeds
      { name: 'Almonds', category: 'Nuts', description: 'Raw almonds', calories: 164, protein: 6, carbs: 6, fats: 14 },
      { name: 'Walnuts', category: 'Nuts', description: 'Raw walnuts', calories: 185, protein: 4, carbs: 4, fats: 18 },
      { name: 'Chia Seeds', category: 'Seeds', description: 'Chia seeds', calories: 137, protein: 4, carbs: 12, fats: 9 },
      
      // Beverages
      { name: 'Water', category: 'Beverage', description: 'Plain water', calories: 0, protein: 0, carbs: 0, fats: 0 },
      { name: 'Green Tea', category: 'Beverage', description: 'Unsweetened green tea', calories: 2, protein: 0, carbs: 0, fats: 0 },
      { name: 'Coffee', category: 'Beverage', description: 'Black coffee', calories: 2, protein: 0, carbs: 0, fats: 0 }
    ];

    const exerciseItems = [
      // Bodyweight Exercises
      { name: 'Push-ups', category: 'Bodyweight', description: 'Upper body exercise', defaultSets: 3, defaultReps: 10, muscleGroups: 'Chest, Triceps, Shoulders', difficulty: 'Beginner' },
      { name: 'Squats', category: 'Bodyweight', description: 'Lower body exercise', defaultSets: 3, defaultReps: 15, muscleGroups: 'Quadriceps, Glutes, Hamstrings', difficulty: 'Beginner' },
      { name: 'Pull-ups', category: 'Bodyweight', description: 'Back exercise', defaultSets: 3, defaultReps: 8, muscleGroups: 'Lats, Biceps, Rhomboids', difficulty: 'Intermediate' },
      { name: 'Lunges', category: 'Bodyweight', description: 'Single leg exercise', defaultSets: 3, defaultReps: 12, muscleGroups: 'Quadriceps, Glutes, Hamstrings', difficulty: 'Beginner' },
      { name: 'Burpees', category: 'Bodyweight', description: 'Full body exercise', defaultSets: 3, defaultReps: 8, muscleGroups: 'Full Body', difficulty: 'Intermediate' },
      { name: 'Mountain Climbers', category: 'Bodyweight', description: 'Cardio and core exercise', defaultSets: 3, defaultReps: 20, muscleGroups: 'Core, Shoulders, Legs', difficulty: 'Beginner' },
      { name: 'Jumping Jacks', category: 'Bodyweight', description: 'Cardiovascular exercise', defaultSets: 3, defaultReps: 30, muscleGroups: 'Full Body', difficulty: 'Beginner' },
      { name: 'Dips', category: 'Bodyweight', description: 'Tricep and chest exercise', defaultSets: 3, defaultReps: 10, muscleGroups: 'Triceps, Chest, Shoulders', difficulty: 'Intermediate' },
      
      // Core Exercises
      { name: 'Plank', category: 'Core', description: 'Core strengthening', defaultSets: 3, defaultReps: 30, muscleGroups: 'Core, Shoulders', difficulty: 'Beginner' },
      { name: 'Crunches', category: 'Core', description: 'Abdominal exercise', defaultSets: 3, defaultReps: 20, muscleGroups: 'Abs', difficulty: 'Beginner' },
      { name: 'Russian Twists', category: 'Core', description: 'Oblique exercise', defaultSets: 3, defaultReps: 20, muscleGroups: 'Obliques, Core', difficulty: 'Beginner' },
      { name: 'Leg Raises', category: 'Core', description: 'Lower abdominal exercise', defaultSets: 3, defaultReps: 15, muscleGroups: 'Lower Abs', difficulty: 'Beginner' },
      { name: 'Bicycle Crunches', category: 'Core', description: 'Dynamic core exercise', defaultSets: 3, defaultReps: 20, muscleGroups: 'Abs, Obliques', difficulty: 'Beginner' },
      { name: 'Dead Bug', category: 'Core', description: 'Core stability exercise', defaultSets: 3, defaultReps: 12, muscleGroups: 'Core', difficulty: 'Beginner' },
      
      // Weight Training
      { name: 'Bench Press', category: 'Weight Training', description: 'Chest exercise', defaultSets: 3, defaultReps: 8, muscleGroups: 'Chest, Triceps, Shoulders', difficulty: 'Intermediate' },
      { name: 'Deadlift', category: 'Weight Training', description: 'Full body exercise', defaultSets: 3, defaultReps: 5, muscleGroups: 'Hamstrings, Glutes, Back', difficulty: 'Advanced' },
      { name: 'Squat', category: 'Weight Training', description: 'Lower body exercise with weights', defaultSets: 3, defaultReps: 8, muscleGroups: 'Quadriceps, Glutes, Hamstrings', difficulty: 'Intermediate' },
      { name: 'Overhead Press', category: 'Weight Training', description: 'Shoulder exercise', defaultSets: 3, defaultReps: 8, muscleGroups: 'Shoulders, Triceps', difficulty: 'Intermediate' },
      { name: 'Bent-over Row', category: 'Weight Training', description: 'Back exercise', defaultSets: 3, defaultReps: 8, muscleGroups: 'Lats, Rhomboids, Biceps', difficulty: 'Intermediate' },
      { name: 'Bicep Curls', category: 'Weight Training', description: 'Arm exercise', defaultSets: 3, defaultReps: 12, muscleGroups: 'Biceps', difficulty: 'Beginner' },
      { name: 'Tricep Extensions', category: 'Weight Training', description: 'Tricep exercise', defaultSets: 3, defaultReps: 12, muscleGroups: 'Triceps', difficulty: 'Beginner' },
      { name: 'Lateral Raises', category: 'Weight Training', description: 'Shoulder exercise', defaultSets: 3, defaultReps: 12, muscleGroups: 'Shoulders', difficulty: 'Beginner' },
      
      // Cardio
      { name: 'Running', category: 'Cardio', description: 'Cardiovascular exercise', defaultSets: 1, defaultReps: 30, muscleGroups: 'Legs, Core', difficulty: 'Beginner' },
      { name: 'Cycling', category: 'Cardio', description: 'Low-impact cardio', defaultSets: 1, defaultReps: 45, muscleGroups: 'Legs, Core', difficulty: 'Beginner' },
      { name: 'Swimming', category: 'Cardio', description: 'Full body workout', defaultSets: 1, defaultReps: 30, muscleGroups: 'Full Body', difficulty: 'Intermediate' },
      { name: 'Jump Rope', category: 'Cardio', description: 'High-intensity cardio', defaultSets: 3, defaultReps: 60, muscleGroups: 'Legs, Core, Shoulders', difficulty: 'Intermediate' },
      { name: 'Rowing', category: 'Cardio', description: 'Full body cardio', defaultSets: 1, defaultReps: 20, muscleGroups: 'Back, Arms, Legs', difficulty: 'Intermediate' },
      { name: 'Elliptical', category: 'Cardio', description: 'Low-impact cardio', defaultSets: 1, defaultReps: 30, muscleGroups: 'Legs, Arms', difficulty: 'Beginner' },
      { name: 'Stair Climbing', category: 'Cardio', description: 'Lower body cardio', defaultSets: 1, defaultReps: 15, muscleGroups: 'Legs, Glutes', difficulty: 'Beginner' },
      
      // Flexibility & Mobility
      { name: 'Yoga', category: 'Flexibility', description: 'Mind-body practice', defaultSets: 1, defaultReps: 60, muscleGroups: 'Full Body', difficulty: 'Beginner' },
      { name: 'Stretching', category: 'Flexibility', description: 'Muscle flexibility', defaultSets: 1, defaultReps: 15, muscleGroups: 'Full Body', difficulty: 'Beginner' },
      { name: 'Pilates', category: 'Flexibility', description: 'Core and flexibility', defaultSets: 1, defaultReps: 45, muscleGroups: 'Core, Full Body', difficulty: 'Beginner' },
      { name: 'Tai Chi', category: 'Flexibility', description: 'Gentle movement practice', defaultSets: 1, defaultReps: 30, muscleGroups: 'Full Body', difficulty: 'Beginner' },
      
      // Functional Training
      { name: 'Farmer\'s Walk', category: 'Functional', description: 'Functional strength exercise', defaultSets: 3, defaultReps: 20, muscleGroups: 'Grip, Core, Legs', difficulty: 'Intermediate' },
      { name: 'Turkish Get-up', category: 'Functional', description: 'Complex movement pattern', defaultSets: 3, defaultReps: 5, muscleGroups: 'Full Body', difficulty: 'Advanced' },
      { name: 'Kettlebell Swing', category: 'Functional', description: 'Hip hinge movement', defaultSets: 3, defaultReps: 15, muscleGroups: 'Hips, Glutes, Core', difficulty: 'Intermediate' },
      { name: 'Battle Ropes', category: 'Functional', description: 'High-intensity conditioning', defaultSets: 3, defaultReps: 30, muscleGroups: 'Arms, Core, Shoulders', difficulty: 'Intermediate' }
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

