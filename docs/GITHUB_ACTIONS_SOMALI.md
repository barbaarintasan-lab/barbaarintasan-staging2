# Sida loo isticmaalo GitHub Actions - Turjumaada Bilowga ah

Buuggan wuxuu sharaxayaa sida loo isticmaalo GitHub Actions workflow si loogu sameeyo turjumaadda bilowga ah ee content-ka Barbaarintasan Academy.

## Talooyin Degdeg ah

### 1️⃣ Tag Repository-ga GitHub
Aad https://github.com/barbaarintasan-ship-it/barbaarintasan-staging2

### 2️⃣ Hubi in Secrets-ka la Dhigay

Secrets-yada ayaa loo baahan yahay hore workflow-ga:

1. **Aad Settings → Secrets and variables → Actions**
2. **Guji "New repository secret"**
3. **Ku dar lambarahan:**
   - **DATABASE_URL** = `postgres://[user]:[password]@[host]:5432/[database]`
   - **OPENAI_API_KEY** = `sk-[your-openai-key]`

### 3️⃣ Socodsii Workflow-ga

1. **Tag tab-ka "Actions"** (bartamaha bogga)
2. **Dooro "Run Initial Translation"** (dhinaca bidix)
3. **Guji "Run workflow"** (badhanka cagaaran)
4. **Hagaaji batch_size** (haddii loo baahdo - default waa 50)
5. **Guji "Run workflow"** si aad u bilowdo

### 4️⃣ Raadi Workflow-ga

- Workflow-gu wuxuu qaadan karaa 2-5 daqiiqo
- Markuu dhameeysto, waxaa soo bixi doona "✅" (guul) ama "❌" (qalad)
- Guji workflow run-ka si aad u aragto logs-ka faahfaahsan

### 5️⃣ Sug OpenAI inay Turjunto (24 saac ilaa)

- OpenAI waxay qaadataa ilaa **24 saac** si ay u turjunto content-ka
- Workflow-gu wuxuu soo saari doonaa job IDs
- Jobs-ka si otomaatig ah ayaa loo hubi doonaa oo la dabaqi doonaa

### 6️⃣ Xaqiiji Turjumaada

Kadib 24-48 saacadood, xaqiiji in turjumaada la dabaqi:

```bash
npm run translate:status
```

Ama aad tag website-ka oo doorato luqadda Ingiriisiga (EN) 🌐

---

## Cillado la Xallin Karo

### ❌ "OpenAI API key not found"

**Xal:**
1. Aad Settings → Secrets and variables → Actions
2. Xaqiiji in `OPENAI_API_KEY` la dhigay
3. Hubi in key-gu uu bilaabanto `sk-`
4. Ku celi workflow-ga

### ❌ "Database URL not found"

**Xal:**
1. Aad Settings → Secrets and variables → Actions
2. Xaqiiji in `DATABASE_URL` la dhigay
3. Hubi qaabka: `postgres://user:password@host:5432/database`
4. Ku celi workflow-ga

### ⏰ Jobs-ku waa "in_progress" muddo dheer

**Caadi ma aha!** OpenAI waxay qaadan kartaa ilaa 24 saac.

**Xal:** Sug oo hubi xaalada marka dambe:
```bash
npm run translate:status
```

---

## Qiimaha (Cost)

- **OpenAI Batch API**: 50% ka jaban qiimaha caadiga ah
- **Qiyaasta guud**: $3-8 USD oo wax soo saarka turjumaad (one-time cost)
- **Waqtiga**: 24-48 saacadood

---

## Macluumaad Dheeraad ah

- **Turjumaad Guide Dhameystiran**: [INITIAL_TRANSLATION_GUIDE.md](../INITIAL_TRANSLATION_GUIDE.md)
- **GitHub Actions Guide (English)**: [GITHUB_ACTIONS_TRANSLATION_GUIDE.md](GITHUB_ACTIONS_TRANSLATION_GUIDE.md)
- **Bilingual System Guide**: [BILINGUAL_SYSTEM_GUIDE.md](../BILINGUAL_SYSTEM_GUIDE.md)

---

## Content Types oo la Turjumayo

Workflow-gu wuxuu turjumayaa 6 nooc oo content ah:

1. 📚 **Courses** (title, description, comingSoonMessage)
2. 📖 **Modules** (title)
3. 📝 **Lessons** (title, description, textContent)
4. ❓ **Quizzes** (question, options, explanation)
5. 👨‍👩‍👧 **Messages** (title, content, keyPoints)
6. 🌙 **Stories** (title, content, moralLesson)

---

**Cusbooneysiinta ugu Dambeysa**: 2026-02-15  
**Version**: 1.0.0
