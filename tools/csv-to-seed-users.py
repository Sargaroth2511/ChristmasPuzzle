#!/usr/bin/env python3
"""
Convert Xmas_Mailing_2025_CSV.csv to seed-users.json format
Maps CSV columns to UserData model fields with proper enum values
"""

import csv
import json
import sys
from pathlib import Path

# Column indices (0-based)
COL_UID = 0          # ID (GUID)
COL_FIRST_NAME = 4   # Vorname
COL_LAST_NAME = 5    # Nachname
COL_LANGUAGE = 9     # Language
COL_SALUTATION = 10  # Personalization (Du/Sie)

def map_language(lang_str):
    """Map language string to enum value"""
    if not lang_str:
        return 0  # Default to German
    # Make case-insensitive and flexible - check for English indicators
    lang_lower = str(lang_str).strip().lower()
    if 'eng' in lang_lower:  # Matches 'english', 'englisch', 'eng', etc.
        return 1
    # Default to German for any other value
    return 0

def map_salutation(salutation_str):
    """Map salutation string to enum value"""
    if not salutation_str:
        return 0  # Default to Informal (Du)
    # Make case-insensitive and flexible - check if 'sie' appears anywhere
    salutation_lower = str(salutation_str).strip().lower()
    if 'sie' in salutation_lower:
        return 1  # Formal
    # Default to Informal (Du) for any other value
    return 0

def convert_csv_to_seed_users(csv_path, output_path):
    """Convert CSV file to seed-users.json format"""
    users = []
    
    with open(csv_path, 'r', encoding='utf-8') as csvfile:
        # Use semicolon delimiter
        reader = csv.reader(csvfile, delimiter=';')
        
        # Skip header row
        next(reader)
        
        for row_num, row in enumerate(reader, start=2):
            if len(row) < 12:
                print(f"Warning: Row {row_num} has insufficient columns, skipping")
                continue
            
            # Extract and clean data
            uid = row[COL_UID].strip()
            first_name = row[COL_FIRST_NAME].strip()
            last_name = row[COL_LAST_NAME].strip()
            language = map_language(row[COL_LANGUAGE])
            salutation = map_salutation(row[COL_SALUTATION])
            
            # Validate required fields
            if not uid or not first_name or not last_name:
                print(f"Warning: Row {row_num} missing required fields (UID/FirstName/LastName), skipping")
                continue
            
            # Create user object
            user = {
                "Uid": uid,
                "FirstName": first_name,
                "LastName": last_name,
                "Language": language,
                "Salutation": salutation
            }
            
            users.append(user)
    
    # Create final structure
    seed_data = {
        "Users": users
    }
    
    # Write to JSON file
    with open(output_path, 'w', encoding='utf-8') as jsonfile:
        json.dump(seed_data, jsonfile, indent=2, ensure_ascii=False)
    
    return len(users)

def main():
    # Paths
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    csv_path = repo_root / "Xmas_Mailing_2025_CSV.csv"
    output_path = repo_root / "src/Server/ChristmasPuzzle.Server/seed-users.json"
    
    # Check if CSV exists
    if not csv_path.exists():
        print(f"Error: CSV file not found at {csv_path}")
        sys.exit(1)
    
    print(f"Reading CSV from: {csv_path}")
    print(f"Output will be written to: {output_path}")
    print()
    
    try:
        user_count = convert_csv_to_seed_users(csv_path, output_path)
        print()
        print(f"✓ Successfully converted {user_count} users")
        print(f"✓ Output written to: {output_path}")
        print()
        print("Next steps:")
        print("1. Review the generated seed-users.json file")
        print("2. Restart the backend: dotnet run")
        print("3. Check logs for successful merge")
        print("4. Test with a sample UID from the CSV")
    except Exception as e:
        print(f"Error during conversion: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
