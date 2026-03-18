#!/bin/bash
# Production build wrapper - sets NODE_ENV to skip Replit dev plugins
export NODE_ENV=production
npm run build
