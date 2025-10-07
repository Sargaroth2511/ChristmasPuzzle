# Quick Test Guide - User Validation

## 🧪 **Test the Personalized Link Feature**

### **Setup** (one-time)

1. **Start Backend:**
   ```bash
   cd src/Server/ChristmasPuzzle.Server
   dotnet run
   ```

2. **Start Frontend (in new terminal):**
   ```bash
   cd ClientApp
   npm start
   ```

---

## ✅ **Test Case 1: Valid User (German, Formal)**

**URL:**
```
http://localhost:4200/?uid=07367ea3-b46a-48db-91eb-b377f113eae5
```

**Expected:**
- ✅ Greeting appears: **"Willkommen zurück, Lars Engels! 🎄"**
- ✅ Greeting fades after 5 seconds
- ✅ Game loads normally
- ✅ Play and complete puzzle
- ✅ Check browser console for: `User stats updated successfully`

---

## ✅ **Test Case 2: Valid User (German, Informal)**

**URL:**
```
http://localhost:4200/?uid=7644866a-ac6d-42d0-9100-4ec45877610b
```

**Expected:**
- ✅ Greeting: **"Willkommen zurück, Larissa Spahl! 🎄"**
- ✅ Same behavior as Test Case 1

---

## ✅ **Test Case 3: Valid User (English)**

**URL:**
```
http://localhost:4200/?uid=dc2fbe5c-8c3a-4a74-82db-961a11c61fc2
```

**Expected:**
- ✅ Greeting: **"Welcome back, John Beier! 🎄"**
- ✅ Same behavior as Test Case 1

---

## ❌ **Test Case 4: Invalid GUID**

**URL:**
```
http://localhost:4200/?uid=00000000-0000-0000-0000-000000000000
```

**Expected:**
- ❌ Error overlay: **"⚠️ Access Denied"**
- ❌ Message: "User not found. Please check your invitation link."
- ✅ Game still loads (but no stats saved)

---

## ❌ **Test Case 5: Missing UID**

**URL:**
```
http://localhost:4200/
```

**Expected:**
- ❌ Error: "No user ID found. Please use the link from your invitation email."
- ✅ Game loads but no stat tracking

---

## 🔍 **What to Check**

### **1. Browser Console**
```javascript
// For valid users, on puzzle completion:
User stats updated successfully: {
  uid: "07367ea3-b46a-48db-91eb-b377f113eae5",
  name: "Lars Engels",
  maxPiecesAchieved: 12,
  fastestTimeSeconds: 45.5,
  totalPuzzlesCompleted: 1,
  ...
}
```

### **2. Backend Terminal**
```
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      User 07367ea3-b46a-48db-91eb-b377f113eae5 achieved new max pieces: 12
info: ChristmasPuzzle.Server.Features.Users.UserDataService[0]
      User 07367ea3-b46a-48db-91eb-b377f113eae5 achieved new fastest time: 45.5s
```

### **3. users.json File**
```bash
# Check that stats were updated
cat src/Server/ChristmasPuzzle.Server/App_Data/users.json
```

Should show non-null values for the user who completed the puzzle.

---

## 📸 **Visual Checks**

### **Greeting (Valid User)**
- Purple gradient background
- Centered at top of screen
- Slides down smoothly
- White text with Christmas tree emoji

### **Error (Invalid User)**
- Pink/red gradient background
- Centered on screen
- Warning icon
- Clear error message

---

## 🎯 **Success Criteria**

- [x] Valid GUIDs show personalized greeting
- [x] Greeting matches user's language and salutation
- [x] Invalid GUIDs show error message
- [x] Missing UID shows error message
- [x] Game stats save only for validated users
- [x] Console shows update confirmation
- [x] Backend logs stat updates
- [x] users.json reflects changes

---

**Test these scenarios and verify all checkboxes!** ✅
