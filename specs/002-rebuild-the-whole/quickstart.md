# Quickstart: Voygent LibreChat Rebuild

**Feature**: 002-rebuild-the-whole
**Purpose**: Verify that the rebuilt LibreChat with Voygent customizations works correctly

---

## Prerequisites

- [ ] Node.js 20.x installed
- [ ] npm installed
- [ ] Docker installed (for local testing and deployment)
- [ ] Access to `/home/neil/dev/voygen/librechat-source` (source customizations)
- [ ] Git repository at `/home/neil/dev/Voygent_ai_2`

---

## Step 1: Backup Existing Installation

```bash
cd /home/neil/dev/Voygent_ai_2
cp -r apps/librechat apps/librechat.backup-$(date +%Y%m%d)
```

**Expected outcome**: Backup directory created with timestamp

---

## Step 2: Copy Customizations to Target

```bash
# From the source directory
cd /home/neil/dev/voygen/librechat-source

# Copy frontend customizations
rsync -av --exclude='node_modules' --exclude='dist' --exclude='.env' \
  client/ /home/neil/dev/Voygent_ai_2/apps/librechat/client/

# Copy backend customizations
rsync -av --exclude='node_modules' --exclude='.env' \
  api/ /home/neil/dev/Voygent_ai_2/apps/librechat/api/

# Copy configuration
cp config/librechat.yaml /home/neil/dev/Voygent_ai_2/apps/librechat/config/

# Copy root files (package.json, Dockerfile, etc.)
cp package.json /home/neil/dev/Voygent_ai_2/apps/librechat/
cp Dockerfile /home/neil/dev/Voygent_ai_2/apps/librechat/
cp .env.example /home/neil/dev/Voygent_ai_2/apps/librechat/
```

**Expected outcome**: All Voygent customization files copied to target directory

---

## Step 3: Install Dependencies

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat

# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

**Expected outcome**: Dependencies installed without errors

---

## Step 4: Configure Environment Variables

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat
cp .env.example .env

# Edit .env and set required variables:
# DATABASE_URL=<MongoDB connection string>
# PORT=3080
# NODE_ENV=development
# (Add other required vars as discovered)
```

**Expected outcome**: `.env` file configured with necessary variables

---

## Step 5: Build Frontend

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat/client
npm run build
```

**Expected outcome**:
- Build completes without errors
- `dist/` directory created
- `dist/index.html` contains "Voygent - AI Travel Planning" title
- Voygent branding assets copied to `dist/assets/`

**Verification**:
```bash
grep "Voygent" dist/index.html
# Should show: <title>Voygent - AI Travel Planning</title>
```

---

## Step 6: Run Unit Tests

```bash
# Frontend tests
cd /home/neil/dev/Voygent_ai_2/apps/librechat/client
npm run test:unit

# Backend tests
cd /home/neil/dev/Voygent_ai_2/apps/librechat/api
npm run test
```

**Expected outcome**: All unit tests pass

---

## Step 7: Start Backend Server

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat
npm run backend
```

**Expected outcome**:
- Server starts on port 3080
- No errors in console
- Health check endpoint responds: `curl http://localhost:3080/api/health`

---

## Step 8: Start Frontend Dev Server (Separate Terminal)

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat/client
npm run dev
```

**Expected outcome**:
- Vite dev server starts on port 3090
- No build errors
- Browser opens to `http://localhost:3090`

---

## Step 9: Verify Voygent Branding

**Manual verification in browser at `http://localhost:3090`:**

- [ ] Page title shows "Voygent - AI Travel Planning"
- [ ] Voygent logo appears (not LibreChat logo)
- [ ] Favicon is Voygent favicon
- [ ] Theme CSS applies Voygent colors

---

## Step 10: Verify StatusBar Component

**In browser:**

- [ ] StatusBar component renders in bottom-right corner
- [ ] Shows "Good evening, <name>" greeting (or equivalent)
- [ ] If no token data: StatusBar not visible or shows placeholder
- [ ] After sending a chat message: StatusBar updates with token usage (if backend provides data)

**Check browser console for errors** - there should be none related to StatusBar

---

## Step 11: Verify Backend API Endpoints

```bash
# Test status endpoint
curl http://localhost:3080/api/voygen/status
# Should return 200 with JSON or 204 No Content

# Test start endpoint
curl -X POST http://localhost:3080/api/voygen/start
# Should return {ok: true}
```

**Expected outcome**: API endpoints respond correctly

---

## Step 12: Run Integration Tests

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat/api
npm run test:integration
```

**Expected outcome**: All integration tests pass

---

## Step 13: Run E2E Tests

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat/client
npm run test:e2e
```

**Expected outcome**: Playwright E2E tests pass (login, chat interaction, StatusBar visibility)

---

## Step 14: Build and Test Docker Image

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat

# Build image
docker build -t voygent-librechat:test .

# Run container
docker run --rm -p 3080:3080 \
  -e DATABASE_URL=<mongo-url> \
  -e PORT=3080 \
  -e NODE_ENV=production \
  voygent-librechat:test
```

**Expected outcome**:
- Docker image builds successfully
- Container starts without errors
- Application accessible at `http://localhost:3080`
- Health check passes: `curl http://localhost:3080/api/health`

---

## Step 15: Verify MCP Server Configuration

**In `config/librechat.yaml`:**

```bash
cd /home/neil/dev/Voygent_ai_2/apps/librechat
cat config/librechat.yaml | grep -A 10 "mcp"
```

**Expected outcome**: MCP servers list shows:
- chrome
- d1_database
- prompt_instructions
- template_document

(NOT the incorrect list from earlier)

---

## Success Criteria

All of the following must be true:

✅ **Build**: Frontend builds without errors, shows Voygent branding
✅ **Tests**: All unit, integration, and E2E tests pass
✅ **Backend**: API endpoints `/api/voygen/status` and `/api/voygen/start` respond correctly
✅ **Frontend**: StatusBar component renders and updates
✅ **Docker**: Image builds and runs successfully
✅ **MCP Config**: Correct server list configured
✅ **No Errors**: Console shows no errors related to Voygent customizations

---

## Troubleshooting

### Build fails with missing dependencies
- Run `npm install` in both root and `client/` directories
- Check `package.json` has all required dependencies

### StatusBar doesn't appear
- Check browser console for React errors
- Verify `App.jsx` imports and renders `<StatusBar />`
- Verify Recoil atoms exported from `store/index.ts`

### API endpoints return 404
- Verify backend routes mounted in `api/server/routes/index.js`
- Check `api/server/routes/voygent/index.js` exports router

### Docker build fails
- Check Dockerfile uses Node.js 20 base
- Verify `package.json` exists in context
- Check `.dockerignore` doesn't exclude needed files

---

## Rollback Procedure

If rebuild fails and needs rollback:

```bash
cd /home/neil/dev/Voygent_ai_2
rm -rf apps/librechat
mv apps/librechat.backup-YYYYMMDD apps/librechat
```

Replace `YYYYMMDD` with actual backup date.

---

## Next Steps

After successful quickstart verification:
1. Commit changes to git
2. Deploy to Render.com (follow deployment documentation)
3. Run full test suite in CI/CD
4. Monitor production logs for any issues
