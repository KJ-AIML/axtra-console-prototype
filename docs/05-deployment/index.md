# Deployment

Deploy Axtra Console to production.

---

## 📖 Documents

| Document | Description |
|----------|-------------|
| [Environment](./environment.md) | All environment variables |
| [Production](./production.md) | Deploy checklist |

---

## 🚀 Quick Deploy

```bash
# 1. Setup environment
export TURSO_AUTH_TOKEN=xxx
export LIVEKIT_API_KEY=xxx
export GOOGLE_API_KEY=xxx

# 2. Build
npm run build

# 3. Start
npm run server:prod
```

---

## 📋 Pre-Deploy Checklist

- [ ] Tests pass
- [ ] Build succeeds
- [ ] Environment configured
- [ ] Database accessible
- [ ] External services ready

---

## 📚 Next Steps

- [Troubleshooting](../06-reference/troubleshooting.md) - Production issues
- [Roadmap](../07-roadmap/) - Future features
