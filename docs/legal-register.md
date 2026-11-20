# nexusHR — Indian Statutory Compliance Legal Register

This legal register documents all primary legal sources, statutory notifications, effective dates, wage ceilings, contribution rates, and implementing code references for Indian payroll compliance in nexusHR.

Every rule must be backed by an official primary source (Gazette of India, Ministry of Labour & Employment, EPFO, ESIC, CBDT, or State Legislature). Secondary articles are not accepted as authority.

---

## 1. Statutory Rules Register

### Rule 1: Employees' Provident Fund (EPF/EPS/EDLI) Wage Ceiling & Proration
- **Subject**: Statutory Monthly Wage Ceiling and Contribution Caps for EPF, EPS, and EDLI.
- **Primary Source**:
  - Pre-17 Sep 2026: Ministry of Labour & Employment Notification G.S.R. 608(E) dated 22 August 2014, effective 1 September 2014.
  - From 17 Sep 2026: Ministry of Labour & Employment Gazette Notification S.O. 5109(E) dated 17 September 2026.
- **Source URL**: https://egazette.gov.in / https://epfindia.gov.in
- **Effective From**: 17 September 2026
- **Statutory Provisions**:
  - Prior to 17 Sep 2026: Wage ceiling = ₹15,000/month.
    - Employee EPF (12%): Capped at ₹1,800/month.
    - Employer EPS (8.33%): Capped at ₹1,250/month.
    - Employer EPF (3.67%): Capped at ₹550/month.
    - EDLI (0.5%): Capped at ₹75/month.
  - From 17 Sep 2026: Wage ceiling = ₹25,000/month.
    - Employee EPF (12%): Capped at ₹3,000/month.
    - Employer EPS (8.33%): Capped at ₹2,083/month (rounded per EPFO rules).
    - Employer EPF (3.67%): Capped at ₹917/month (or ₹3,000 - ₹2,083).
    - EDLI (0.5%): Capped at ₹125/month.
- **Split-Month Proration Rule (September 2026)**:
  - September 2026 has 30 days.
  - Days 1 to 16 (16 days): Capped at ₹15,000 prorated = `(15,000 / 30) * 16` = ₹8,000.
  - Days 17 to 30 (14 days): Capped at ₹25,000 prorated = `(25,000 / 30) * 14` = ₹11,666.67.
  - Total effective ceiling for September 2026 = ₹19,666.67.
  - Filed as a single monthly ECR return with the prorated statutory wage base.
- **Status**: Implemented in Phase 2 & Phase 3.
- **Implementing Code**: [lib/statutory/pfRules.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/lib/statutory/pfRules.ts), [models/SalaryStructure.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/models/SalaryStructure.ts), [services/statutory/ruleResolverService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/ruleResolverService.ts). Test suites: [scripts/test-phase2-pf.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase2-pf.ts), [scripts/test-phase3-layered-config.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase3-layered-config.ts).

---

### Rule 2: Wage Definition & 50% Remuneration Cap (Code on Wages, 2019)
- **Subject**: Uniform definition of "Wages" across PF, ESI, Gratuity, and Statutory Bonus.
- **Primary Source**: Ministry of Labour & Employment Notification S.O. 5322(E) dated 21 November 2025.
- **Source URL**: https://egazette.gov.in / https://labour.gov.in
- **Effective From**: 21 November 2025
- **Statutory Provisions**:
  - Section 2(y) of the Code on Wages, 2019 / Section 2(88) of Code on Social Security, 2020.
  - Inclusions: Basic Pay, Dearness Allowance (DA), Retaining Allowance.
  - Exclusions: House Rent Allowance (HRA), Conveyance, Overtime, House-accommodation/amenities, statutory bonus, gratuity, employer PF/pension contributions, commission, retrenchment compensation.
  - **The 50% Proviso Rule**: If the sum total of excluded allowances exceeds 50% of total remuneration (all earnings including exclusions), the excess amount over 50% is deemed as wages and added back to the wage base for PF and ESI computations.
- **Status**: Implemented in Phase 4.
- **Implementing Code**: [services/statutory/wageDefinitionService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/wageDefinitionService.ts), [services/statutory/wageCalculationService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/wageCalculationService.ts). Test suite: [scripts/test-phase4-validations.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase4-validations.ts).

---

### Rule 3: EPF, EPS, and EDLI Schemes, 2026 & ECR Export Format
- **Subject**: Modernized Provident Fund schemes replacing the Employees' Provident Funds Scheme, 1952.
- **Primary Source**: Ministry of Labour & Employment Gazette Notification G.S.R. 525(E) dated 29 June 2026.
- **Source URL**: https://egazette.gov.in / https://epfindia.gov.in
- **Effective From**: 29 June 2026 (applicable from July 2026 wage cycle).
- **ECR Specifications**:
  - File extension: `.txt` (ASCII/UTF-8, no header line, no trailing empty lines).
  - Delimiter: `#~#` (Hash-Tilde-Hash).
  - Standard 11 columns:
    1. UAN (12 digits)
    2. Member Name (per EPFO records)
    3. Gross Wages (integer)
    4. EPF Wages (capped or actual per company rule)
    5. EPS Wages (capped at statutory ceiling)
    6. EDLI Wages (capped at statutory ceiling)
    7. EPF Contribution - Employee Share (12%)
    8. EPS Contribution - Employer Share (8.33% capped)
    9. EPF-EPS Difference - Employer Share (3.67%)
    10. NCP Days (Non-Contributory Period / Loss of Pay days in the month)
    11. Refund of Advances (0 if none)
- **Status**: Implemented in Phase 5.
- **Implementing Code**: [services/statutory/ecrExportService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/ecrExportService.ts), [app/api/payroll/export/ecr/route.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/app/api/payroll/export/ecr/route.ts). Test suite: [scripts/test-phase5-exports.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase5-exports.ts).

---

### Rule 4: Employees' State Insurance (ESI) Wage Limit & Contribution Period
- **Subject**: ESI Wage Threshold, Contribution Rates, and Contribution Period Lock-in.
- **Primary Source**:
  - Wage ceiling: Ministry of Labour & Employment Notification G.S.R. 959(E) dated 6 October 2016, effective 1 January 2017.
  - Disability ceiling: G.S.R. 253(E) dated 27 March 2019 (₹25,000 for employees with disability).
  - Contribution rates: G.S.R. 423(E) dated 13 June 2019, effective 1 July 2019.
- **Source URL**: https://www.esic.gov.in / https://egazette.gov.in
- **Effective From**: Current rates effective from 1 July 2019; ceiling from 1 January 2017.
- **Statutory Provisions**:
  - Standard monthly wage threshold: ₹21,000 (Gross wages / Code wages).
  - Rates: Employee share = 0.75% of gross wages; Employer share = 3.25% of gross wages.
  - **Contribution Period Rule** (Regulation 4 of ESI General Regulations, 1950):
    - Contribution Period 1: 1 April to 30 September.
    - Contribution Period 2: 1 October to 31 March.
    - If an employee's wages exceed ₹21,000 in any month during an ongoing contribution period, the employee continues to be covered and deductions continue until the end of that 6-month contribution period.
  - **Portal Export Layout**:
    - Format: Excel `.xls` / `.xlsx` (6 columns: A: IP Number [10 digits], B: IP Name, C: Paid Days, D: Total Monthly Wages, E: Reason Code for Zero Working Days [0=None], F: Last Working Day [DD/MM/YYYY]).
- **Status**: Implemented in Phase 4 & Phase 5.
- **Implementing Code**: [services/statutory/esicExportService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/esicExportService.ts), [app/api/payroll/export/esic/route.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/app/api/payroll/export/esic/route.ts), [services/statutory/wageCalculationService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/wageCalculationService.ts), [services/statutory/validationService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/validationService.ts). Test suite: [scripts/test-phase5-exports.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase5-exports.ts).

---

### Rule 5: Professional Tax (PT) State Slabs & February Adjustment
- **Subject**: State-specific professional tax deduction schedules and annual adjustment.
- **Primary Sources**:
  - **Maharashtra**: Maharashtra State Tax on Professions, Trades, Callings and Employments Act, 1975 (amended by Mah. Act No. VIII of 2023).
    - Males earning > ₹10,000: ₹200/month (Apr–Jan), ₹300 in February (Total ₹2,500/year).
    - Females earning ≤ ₹25,000: Exempt. Females > ₹25,000: ₹200/month (Feb ₹300).
  - **Karnataka**: Karnataka Tax on Professions, Trades, Callings and Employments Act, 1976 (amended by Karnataka Act No. 14 of 2023, effective 1 April 2023).
    - Gross salary < ₹25,000: ₹0.
    - Gross salary ≥ ₹25,000: ₹200/month (₹2,400/year).
  - **Telangana / Andhra Pradesh**: AP/Telangana Tax on Professions, Trades, Callings and Employments Act, 1987.
    - Gross ≤ ₹15,000: ₹0.
    - ₹15,001 to ₹20,000: ₹150/month.
    - > ₹20,000: ₹200/month.
  - **Gujarat**: Gujarat Panchayats, Municipalities, Municipal Corporations and State Tax on Professions, Trades, Callings and Employments Act, 1976.
    - Gross ≤ ₹12,000: ₹0.
    - > ₹12,000: ₹200/month.
  - **West Bengal**: West Bengal State Tax on Professions, Trades, Callings and Employments Act, 1979.
    - Slabs up to ₹40,000: tiered from ₹110 to ₹200/month.
  - **States without PT**: Delhi, Haryana, Uttar Pradesh, Rajasthan, Punjab, Himachal Pradesh, Uttarakhand, Chandigarh, Goa.
- **Status**: Implemented in Phase 6.
- **Implementing Code**: [services/statutory/ptExportService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/ptExportService.ts), [app/api/payroll/export/pt/route.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/app/api/payroll/export/pt/route.ts). Test suite: [scripts/test-phase6-pt-tds.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase6-pt-tds.ts).

---

### Rule 6: Income-tax Act, 2025: Section 392, Form 138 (replaces 24Q) & Form 130
- **Subject**: Salary TDS deduction and transition from Income-tax Act, 1961 to Income-tax Act, 2025.
- **Primary Source**:
  - Income-tax Act, 2025 (Section 392: Deduction of tax from salaries; Section 395(4): TDS certificate).
  - Income-tax Rules, 2026 (Rule 219: Quarterly return of TDS; Rule 215: Certificate of deduction).
- **Source URL**: https://incometaxindia.gov.in / https://egazette.gov.in
- **Effective From**: Financial Year 2026-27 (Tax Year 2026-27) onwards.
- **Transition Rule**:
  - **Tax Year 2025-26 and earlier**:
    - Governing law: Income-tax Act, 1961, Section 192.
    - Quarterly return: Form 24Q (filed through e-TDS RPU).
    - Certificate: Form 16 (Part A from TRACES, Part B from employer).
  - **Tax Year 2026-27 onwards**:
    - Governing law: Income-tax Act, 2025, Section 392.
    - Quarterly return: Form 138 (filed quarterly per Rule 219).
    - Certificate: Form 130 (generated exclusively via TRACES portal under Rule 215).
- **Status**: Implemented in Phase 6.
- **Implementing Code**: [services/statutory/tdsExportService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/tdsExportService.ts), [app/api/payroll/export/tds/route.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/app/api/payroll/export/tds/route.ts). Test suite: [scripts/test-phase6-pt-tds.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase6-pt-tds.ts).

---

### Rule 7: Form 130 / Form 16 Legal Restriction (TRACES Exclusivity)
- **Subject**: Prohibition of self-generated Form 130 / Form 16 certificates.
- **Primary Source**: CBDT Notification read with Rule 215 of Income-tax Rules, 2026 / Rule 31 of Income-tax Rules, 1962.
- **Rule**:
  - An employer is legally prohibited from self-generating or issuing uncertified Form 130 or Form 16 Part A certificates.
  - Valid certificates must bear the TRACES watermark, unique certificate number, and digital signature downloaded directly from the TRACES portal post-processing of Form 138 / 24Q.
  - **nexusHR Architecture Mandate**: nexusHR will NEVER generate a document titled "Form 16" or "Form 130".
  - nexusHR will provide an "Employee Salary & Tax Computation Statement" with an explicit watermark: *"Computation Statement Only — Not a Valid Tax Deduction Certificate under Section 395/203"*.
  - nexusHR will provide an upload mechanism for HR to ingest and map the genuine TRACES-issued PDF certificates to each employee.
- **Status**: Implemented in Phase 6.
- **Implementing Code**: [models/TdsCertificate.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/models/TdsCertificate.ts), [services/statutory/tdsExportService.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/services/statutory/tdsExportService.ts) (`generateEmployeeComputationStatement`), [app/api/payroll/tds-certificate/route.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/app/api/payroll/tds-certificate/route.ts). Test suite: [scripts/test-phase6-pt-tds.ts](file:///c:/Users/Anirudh%20Bhardwaj/Desktop/nexusHR/scripts/test-phase6-pt-tds.ts).

---

### Rule 8: Statutory Deadlines and Configurable Government Extension Register
- **Subject**: Statutory monthly and quarterly deposit and return filing due dates.
- **Primary Source**:
  - EPF Scheme, para 38 (Monthly PF deposit: 15th of following month).
  - ESI General Regulations, reg 31 (Monthly ESI deposit: 15th of following month).
  - Income-tax Rules (Monthly TDS deposit: 7th of following month; 30th April for March deductions).
  - Income-tax Rules Rule 219 (Form 138 / 24Q Quarterly Return):
    - Q1 (Apr-Jun): 31 July
    - Q2 (Jul-Sep): 31 October
    - Q3 (Oct-Dec): 31 January
    - Q4 (Jan-Mar): 31 May
  - Income-tax Rules Rule 215 (Annual Certificate Form 130 / 16): 15 June.
- **Configurable Override Engine**:
  - When the government grants an extension, super_admin or admin can register an extension override containing:
    1. Governing Authority (EPFO / ESIC / CBDT / State PT Commissioner)
    2. Circular / Order Number
    3. Order Date
    4. Statutory Filing Type (e.g., ECR_MONTHLY, ESI_MONTHLY, FORM_138_Q1)
    5. Applicable Period (e.g., 2026-09)
    6. Extended Due Date
- **Status**: Verified.
- **Implementing Code**: `models/StatutoryExtension.ts`, `services/statutory/calendarService.ts` (Phase 7).

---

## 2. Open Questions & Items Pending Final Authority Guidance

1. **EPFO September 2026 Split-Rate Rounding Specifics**:
   - For September 2026, the ceiling prorates to ₹19,666.67. EPFO's Unified Portal standard validator typically checks integers for wages (`Math.round` or floor). Should the wage base ceiling be rounded to ₹19,667 or ₹19,666?
   - *Working assumption for Phase 2*: Use `Math.round(19666.67)` = ₹19,667 unless the EPFO validator documentation specifies integer floor truncation.
2. **ESIC Voluntary Inclusion above ₹21,000**:
   - When an establishment opts to cover employees above ₹21,000, do all employees above the threshold become covered, or is coverage strictly governed by the contribution period carryover?
   - *Working assumption*: Follow statutory regulation strictly: entry is restricted to employees whose gross wages are ≤ ₹21,000 at the start of the contribution period, with lock-in until the contribution period ends.
3. **Form 138 Electronic File Format Specification**:
   - The Income Tax Department releases file validation utility (FVU) data schemas per financial year. Has the Directorate of Income Tax (Systems) finalized the FVU specification layout for Form 138 (data fields and text structure), or is it identical to the 24Q schema with updated section codes?
   - *Working assumption for Phase 6*: Support legacy 24Q layout for FY ≤ 2025-26; for FY 2026-27, provide Form 138 data structure mapping with section 392 fields, flagged for final FVU schema validation.
