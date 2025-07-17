#!/bin/bash

# Debug Tool Runner for Task Management Gamification App
# Usage: ./debug.sh [test-name]

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Task Management App - Debug Tool${NC}"
echo -e "${BLUE}=====================================${NC}"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if server is running
if ! curl -s http://localhost:5000/api/progress > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Server is not running. Start it with: npm run dev${NC}"
    echo -e "${YELLOW}   Make sure to run this in another terminal first${NC}"
    exit 1
fi

# Check if debug tool exists
if [ ! -f "debug-tool.js" ]; then
    echo -e "${RED}❌ debug-tool.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Run the debug tool
if [ $# -eq 0 ]; then
    echo -e "${BLUE}Running all tests...${NC}"
    node debug-tool.js
else
    echo -e "${BLUE}Running specific test: $1${NC}"
    node debug-tool.js "$1"
fi

echo ""
echo -e "${BLUE}Available test commands:${NC}"
echo -e "  ${GREEN}./debug.sh${NC}              - Run all tests"
echo -e "  ${GREEN}./debug.sh tasks${NC}        - Test task management"
echo -e "  ${GREEN}./debug.sh recycling${NC}    - Test recycling system"
echo -e "  ${GREEN}./debug.sh shop${NC}         - Test shop system"
echo -e "  ${GREEN}./debug.sh gamification${NC} - Test gamification features"
echo -e "  ${GREEN}./debug.sh notion${NC}       - Test Notion integration"
echo -e "  ${GREEN}./debug.sh integration${NC}  - Test end-to-end workflows"