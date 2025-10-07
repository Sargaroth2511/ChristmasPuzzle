# User Individualization - Updated Guide (with GUID, Language & Salutation)

## 🎯 What Changed

The user individualization feature has been updated with:
- ✅ **GUID for UIDs** - More secure and standard unique identifiers
- ✅ **Language Support** - German (default) or English
- ✅ **Salutation** - Informal (du) or Formal (Sie) addressing

## 📊 User Data Model

### Enums

**Language** (0 = German, 1 = English)
```csharp
public enum Language
{
    German,   // 0 - German UI (default)
    English   // 1 - English UI
}
```

**Salutation** (0 = Informal/du, 1 = Formal/Sie)
```csharp
public enum Salutation
{
    Informal,  // 0 - du (default)
    Formal     // 1 - Sie
}
```

### UserData Model

```csharp
public class UserData
{
    public Guid Uid { get; set; }                    // GUID identifier
    public string Name { get; set; }                 // Display name
    public Language Language { get; set; }           // German or English
    public Salutation Salutation { get; set; }       // du or Sie
    public int MaxPiecesAchieved { get; set; }
    public double? FastestTimeSeconds { get; set; }
    public int TotalPuzzlesCompleted { get; set; }
    public DateTime LastAccessedUtc { get; set; }
}
```

## 📂 Updated JSON Structure

```json
{
  "Users": [
    {
      "Uid": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
      "Name": "Max Mustermann",
      "Language": "German",
      "Salutation": "Formal",
      "MaxPiecesAchieved": 12,
      "FastestTimeSeconds": 45.5,
      "TotalPuzzlesCompleted": 3,
      "LastAccessedUtc": "2025-10-07T12:00:00Z"
    }
  ]
}
```

## 🔌 Updated API Endpoints

### Get User Data
```
GET /api/users/{uid:guid}?name={name}&language={0|1}&salutation={0|1}
```

**Parameters:**
- `uid` (path, GUID, required): User's unique identifier
- `name` (query, string, optional): Display name (only for new users)
- `language` (query, int, optional): 0=German (default), 1=English
- `salutation` (query, int, optional): 0=Informal/du (default), 1=Formal/Sie

**Examples:**

```bash
# German user with formal salutation (Sie)
GET /api/users/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d?name=Herr Müller&language=0&salutation=1

# English user with informal address
GET /api/users/123e4567-e89b-12d3-a456-426614174000?name=John&language=1&salutation=0

# Use defaults (German, informal/du)
GET /api/users/550e8400-e29b-41d4-a716-446655440000?name=Anna
```

**Response:**
```json
{
  "uid": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
  "name": "Max Mustermann",
  "language": "German",
  "salutation": "Formal",
  "maxPiecesAchieved": 12,
  "fastestTimeSeconds": 45.5,
  "totalPuzzlesCompleted": 3,
  "lastAccessedUtc": "2025-10-07T12:00:00Z"
}
```

### Update Stats
```
POST /api/users/{uid:guid}/stats
```

Same as before, just using GUID format for UID.

## 💻 Frontend Integration

### TypeScript Interfaces

```typescript
export enum Language {
  German = 0,
  English = 1
}

export enum Salutation {
  Informal = 0,  // du
  Formal = 1     // Sie
}

export interface UserData {
  uid: string;  // GUID as string
  name: string;
  language: 'German' | 'English';  // JSON format
  salutation: 'Informal' | 'Formal';  // JSON format
  maxPiecesAchieved: number;
  fastestTimeSeconds: number | null;
  totalPuzzlesCompleted: number;
  lastAccessedUtc: string;
}
```

### URL Structure

Users access personalized links with GUID:
```
https://yoursite.com/?uid=a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d&name=Max&lang=de&formal=true
```

### Parse URL Parameters

```typescript
export class AppComponent implements OnInit {
  userId: string;
  userName: string;
  userLanguage: Language;
  userSalutation: Salutation;
  userData?: UserData;

  ngOnInit() {
    const params = new URLSearchParams(window.location.search);
    
    // Get or generate GUID
    this.userId = params.get('uid') || this.generateGuid();
    this.userName = params.get('name') || 'Puzzler';
    
    // Parse language: 'de'/'en' to enum
    const langParam = params.get('lang');
    this.userLanguage = langParam === 'en' ? Language.English : Language.German;
    
    // Parse salutation: 'true'/'false' for formal
    const formalParam = params.get('formal');
    this.userSalutation = formalParam === 'true' ? Salutation.Formal : Salutation.Informal;
    
    this.loadUserData();
  }

  async loadUserData() {
    const url = `/api/users/${this.userId}?` +
      `name=${encodeURIComponent(this.userName)}&` +
      `language=${this.userLanguage}&` +
      `salutation=${this.userSalutation}`;
      
    const response = await fetch(url);
    this.userData = await response.json();
    
    this.applyLanguage();
    this.showGreeting();
  }

  applyLanguage() {
    // Set UI language based on userData.language
    if (this.userData?.language === 'English') {
      // Load English translations
    } else {
      // Load German translations (default)
    }
  }

  showGreeting() {
    const greeting = this.getGreeting();
    console.log(greeting);
  }

  getGreeting(): string {
    if (!this.userData) return '';
    
    const { name, language, salutation } = this.userData;
    
    if (language === 'German') {
      if (salutation === 'Formal') {
        return `Willkommen zurück, ${name}!`; // Sie
      } else {
        return `Willkommen zurück, ${name}!`; // du
      }
    } else {
      return `Welcome back, ${name}!`;
    }
  }

  private generateGuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
```

### Localized Messages

```typescript
interface LocalizedMessages {
  greeting: string;
  congratulations: string;
  newRecord: string;
  fastestTime: string;
  maxPieces: string;
  totalCompleted: string;
}

class MessageService {
  getMessages(language: Language, salutation: Salutation): LocalizedMessages {
    const isFormal = salutation === Salutation.Formal;
    
    if (language === Language.German) {
      return {
        greeting: isFormal ? 'Willkommen zurück!' : 'Willkommen zurück!',
        congratulations: isFormal ? 
          'Herzlichen Glückwunsch! Sie haben das Puzzle gelöst!' : 
          'Herzlichen Glückwunsch! Du hast das Puzzle gelöst!',
        newRecord: isFormal ? 
          'Sie haben einen neuen Rekord aufgestellt!' : 
          'Du hast einen neuen Rekord aufgestellt!',
        fastestTime: 'Schnellste Zeit',
        maxPieces: 'Maximale Teile',
        totalCompleted: 'Gesamt gelöst'
      };
    } else {
      return {
        greeting: 'Welcome back!',
        congratulations: 'Congratulations! You solved the puzzle!',
        newRecord: 'You set a new record!',
        fastestTime: 'Fastest Time',
        maxPieces: 'Max Pieces',
        totalCompleted: 'Total Completed'
      };
    }
  }
}
```

## 🧪 Testing Examples

### Using cURL

```bash
# Create German user with formal salutation
curl "http://localhost:5000/api/users/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d?name=Herr%20Müller&language=0&salutation=1"

# Create English user
curl "http://localhost:5000/api/users/123e4567-e89b-12d3-a456-426614174000?name=John&language=1&salutation=0"

# Update stats
curl -X POST http://localhost:5000/api/users/a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d/stats \
  -H "Content-Type: application/json" \
  -d '{"piecesAchieved":12,"completionTimeSeconds":45.5,"puzzleCompleted":true}'
```

### Using Users.http

Open `Features/Users/Users.http` in VS Code and click "Send Request" above any request.

## 🎨 UI Examples Based on Settings

### German Formal (Sie)
```
Willkommen zurück, Herr Müller! 🎄

Ihre Bestleistungen:
⏱️ Schnellste Zeit: 45.5s
🧩 Maximale Teile: 12
✅ Gesamt gelöst: 3

Sie haben einen neuen Rekord aufgestellt!
```

### German Informal (du)
```
Willkommen zurück, Anna! 🎄

Deine Bestleistungen:
⏱️ Schnellste Zeit: 52.3s
🧩 Maximale Teile: 8
✅ Gesamt gelöst: 1

Du hast einen neuen Rekord aufgestellt!
```

### English
```
Welcome back, John! 🎄

Your Best Stats:
⏱️ Fastest Time: 48.7s
🧩 Max Pieces: 10
✅ Total Completed: 2

You set a new record!
```

## 🔐 Generating Secure GUIDs

### Backend (C#)
```csharp
var newUid = Guid.NewGuid();
// Example: a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
```

### Frontend (TypeScript)
```typescript
function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
```

### Share Link Generator
```typescript
generateShareLink(): string {
  const lang = this.userData.language === 'English' ? 'en' : 'de';
  const formal = this.userData.salutation === 'Formal' ? 'true' : 'false';
  
  return `${window.location.origin}/?` +
    `uid=${this.userId}&` +
    `name=${encodeURIComponent(this.userData.name)}&` +
    `lang=${lang}&` +
    `formal=${formal}`;
}
```

## ✅ What's Working Now

- ✅ GUID-based user identification (more secure)
- ✅ Language preference (German/English)
- ✅ Salutation preference (du/Sie for German)
- ✅ Thread-safe JSON storage
- ✅ Auto-creates new users with preferences
- ✅ RESTful API with proper routing
- ✅ Type-safe enums
- ✅ Validation for GUID format
- ✅ Updated test examples
- ✅ Successfully compiles!

## 🎯 Next Steps

1. **Frontend**: Implement language switching based on `userData.language`
2. **Translations**: Create German and English message files
3. **Salutation**: Apply formal/informal addressing in German UI
4. **URL Routing**: Handle GUID in query parameters
5. **Share Links**: Let users share their personalized GUID links

## 📝 Key Defaults

- **Language**: German (if not specified)
- **Salutation**: Informal/du (if not specified)
- **Name**: "Puzzler" (if not specified)

All parameters are optional when creating a user - the system will use sensible defaults!

---

**Ready to localize!** 🌍 Your Christmas Puzzle now supports multilingual, personalized experiences! 🎄✨
