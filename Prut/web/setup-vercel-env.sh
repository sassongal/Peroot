#!/bin/bash

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Error: .env.local file not found!"
    exit 1
fi

echo "Syncing environment variables from .env.local to Vercel (Production)..."

# Read .env.local line by line
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    if [[ $line =~ ^#.* ]] || [[ -z $line ]]; then
        continue
    fi

    # Extract key and value
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)

    # Remove quotes if present
    value="${value%\"}"
    value="${value#\"}"

    if [ -n "$key" ] && [ -n "$value" ]; then
        echo "Adding $key..."
        # Pipe value to vercel env add to avoid exposing it in process list
        # "production" is the target environment
        echo -n "$value" | vercel env add "$key" production 
    fi
done < .env.local

echo "-----------------------------------"
echo "✅ Environment variables synced!"
echo "Please redeploy your project for changes to take effect: vercel --prod"
