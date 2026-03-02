# LogPanda – Full Setup Plan

---

# PHASE 1 — AWS ACCOUNT SETUP

1. Create AWS account  ✅
2. Enable MFA on root account  ✅
3. Create IAM admin user (do NOT use root for daily work) ✅
4. Create access keys for IAM user  (logpanda-matej) ✅
5. Install AWS CLI locally  ✅
6. Configure AWS CLI with your credentials  ✅
7. Install Node.js  ✅
8. Install pnpm  ✅
9. Install AWS CDK globally  ✅
10. Run `cdk bootstrap` for your AWS account  ✅

---

# PHASE 2 — REPOSITORY SETUP

11. Create GitHub repository (LogPanda)  ✅
12. Initialize monorepo structure  ✅
13. Configure pnpm workspaces  ✅
14. Set up frontend (Next.js)  ✅
15. Set up backend (Lambdas)  ✅
16. Set up infra folder (CDK project)  ✅
17. Commit and push to GitHub  ✅

---

# PHASE 3 — CDK INFRASTRUCTURE

18. Define dev stack  ✅
19. Define staging stack  ✅
20. Define prod stack  ✅
21. Add environment config handling  ✅
22. Test `cdk synth` locally  ✅
23. Test `cdk deploy` locally to dev  ✅

---

# PHASE 4 — GITHUB ENVIRONMENTS

24. Create `dev` environment in GitHub   ✅
25. Create `staging` environment  ✅
26. Create `production` environment  ✅
27. Add AWS credentials as secrets per environment  ✅
28. Add required reviewer for production environment  ✅

---

# PHASE 5 — GITHUB ACTIONS

29. Create `.github/workflows/deploy.yml`  ✅
30. Add workflow for push to `dev` branch  ✅
31. Add manual workflow trigger for `staging`  ✅
32. Add manual workflow trigger for `production`  ✅
33. Configure environment selection inside workflow  ✅
34. Test dev deployment via push  ✅
35. Test staging manual deployment  ✅
36. Test production approval flow  ✅

---

# PHASE 6 — HARDENING

37. Add branch protection rules  
38. Protect `dev`, `staging`, `prod` branches  
39. Require PR approvals  
40. Enable required status checks  
41. Add budget alert in AWS  
42. Verify CloudWatch logs  
43. Verify rollback works  

---

# RESULT

- AWS account configured  
- Infrastructure as Code via CDK  
- 3 deployment environments  
- GitHub Actions pipeline  
- Manual promotion flow  
- Production approval gate  
- Fully serverless deployment  

# Repository structure

logpanda/
│
├── apps/
│   ├── frontend/                 # Next.js application
│   │   ├── app/                  # App router (pages/layouts)
│   │   ├── components/
│   │   ├── lib/
│   │   ├── public/
│   │   ├── next.config.js
│   │   └── package.json
│   │
│   └── backend/                  # Lambda handlers
│       ├── src/
│       │   ├── handlers/
│       │   ├── services/
│       │   ├── repositories/
│       │   └── types/
│       ├── package.json
│       └── tsconfig.json
│
├── infra/                        # AWS CDK (Infrastructure as Code)
│   ├── bin/
│   │   └── logpanda.ts
│   ├── lib/
│   │   ├── stacks/
│   │   │   ├── dev-stack.ts
│   │   │   ├── staging-stack.ts
│   │   │   └── prod-stack.ts
│   │   └── constructs/
│   ├── cdk.json
│   ├── package.json
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── package.json                  # Root (pnpm workspace)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
└── README.md