export interface SampleDocumentPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  filename: string;
  mimeType: string;
  content: string;
}

export const SAMPLE_DOCUMENTS: SampleDocumentPreset[] = [
  {
    id: 'sample-prescription',
    name: 'Apollo Clinic Prescription',
    badge: 'Prescription',
    description: 'Dr. Sunita Rao: Metformin, Lisinopril, Atorvastatin & BP vitals',
    filename: 'Sample_Prescription_Dr_Sunita_Rao.txt',
    mimeType: 'text/plain',
    content: `APOLLO MULTISPECIALTY CLINIC
Department of Internal Medicine
104 Healthcare Boulevard, Bangalore, Karnataka - 560034
License No: KA-MED-84920 | Phone: +91 80 4920 1100

================================================================================
PATIENT PRESCRIPTION
================================================================================

Date: 2026-03-15
Patient Name: Rajesh Kumar
Age: 52 Years | Sex: Male
ABHA ID: 91-8472-9102-4412
Patient ID: PT-2026-08149
Consulting Physician: Dr. Sunita Rao, MD (Internal Medicine)
Reg. No: KMC-49201

CLINICAL DIAGNOSIS:
1. Type 2 Diabetes Mellitus - poorly controlled
2. Primary Essential Hypertension (Stage 1)
3. Dyslipidemia

VITAL SIGNS:
- Blood Pressure: 138/88 mmHg
- Heart Rate: 76 bpm
- Weight: 78.5 kg | Height: 172 cm | BMI: 26.5 kg/m²
- SpO2: 98% on room air

PRESCRIPTION / MEDICATIONS:
--------------------------------------------------------------------------------
1. Tab. Metformin Hydrochloride 500 mg
   - Route: Oral
   - Dosage: 500 mg
   - Frequency: Twice daily (BD) - with meals
   - Duration: 90 days
   - Instructions: Take immediately after breakfast and dinner. Do not skip meals.

2. Tab. Lisinopril 10 mg
   - Route: Oral
   - Dosage: 10 mg
   - Frequency: Once daily (OD) - morning
   - Duration: 90 days
   - Instructions: Take daily at 8:00 AM with water. Monitor blood pressure weekly.

3. Tab. Atorvastatin 20 mg
   - Route: Oral
   - Dosage: 20 mg
   - Frequency: Once daily (OD) - bedtime
   - Duration: 90 days
   - Instructions: Take at bedtime. Report any unexplained muscle soreness.

4. Tab. Aspirin 75 mg (Enteric Coated)
   - Route: Oral
   - Dosage: 75 mg
   - Frequency: Once daily (OD) - post lunch
   - Duration: 90 days
   - Instructions: Take after food.

DIETARY & LIFESTYLE ADVICE:
- Diabetic diet: Restrict refined carbohydrates, sugar, and high-glycemic foods.
- Low-sodium diet (< 2g sodium/day).
- 30 minutes brisk walking at least 5 days a week.
- Maintain daily home fasting glucose log.

RECOMMENDED INVESTIGATIONS (In 8 Weeks):
- Fasting Blood Sugar (FBS) & Post Prandial (PPBS)
- HbA1c
- Serum Creatinine & eGFR
- Lipid Profile

NEXT FOLLOW-UP:
May 15, 2026 (or earlier if persistent headache, dizziness, or hypoglycemic symptoms).

Dr. Sunita Rao, MD
Apollo Multispecialty Clinic
[Digital Signature Verified]`,
  },
  {
    id: 'sample-lab-report',
    name: 'Metropolis Diagnostics Lab Report',
    badge: 'Lab Report',
    description: 'Comprehensive Metabolic & Lipid Panel with flagged abnormal values',
    filename: 'Sample_Metabolic_Lipid_Panel_Report.txt',
    mimeType: 'text/plain',
    content: `METROPOLIS DIAGNOSTIC & PATHOLOGY LABORATORIES
NABL Accredited Laboratory | ISO 15189:2012 Certified
Main Diagnostic Center, Indiranagar, Bangalore - 560038
Toll Free: 1800 200 4567 | Email: reports@metropolisdx.com

================================================================================
COMPREHENSIVE BIOCHEMISTRY & HEMATOLOGY REPORT
================================================================================

PATIENT DETAILS:
Patient Name: Rajesh Kumar               Sample ID: DX-2026-99214
Age/Gender: 52 Y / Male                 Barcode: *DX99214*
Referred By: Dr. Sunita Rao, MD          Collection Date: 2026-03-12 07:30 AM
Sample Type: Whole Blood (EDTA) & Serum  Report Date: 2026-03-12 04:15 PM
Status: Final Verified Report

--------------------------------------------------------------------------------
TEST NAME                  RESULT       FLAG     UNITS       REFERENCE RANGE
--------------------------------------------------------------------------------

GLYCEMIC PROFILE
Fasting Blood Sugar (FBS)   148.0        HIGH     mg/dL       70.0 - 99.0
Post Prandial Sugar (PPBS)  210.5        HIGH     mg/dL       < 140.0
Glycated Hemoglobin (HbA1c) 8.2          HIGH     %           4.0 - 5.6 (Normal)
                                                              5.7 - 6.4 (Prediabetes)
                                                              >= 6.5 (Diabetic)
Average Blood Glucose (eAG) 188.6        HIGH     mg/dL       --

LIPID PROFILE
Total Cholesterol          224.0        HIGH     mg/dL       < 200.0
Triglycerides              192.0        HIGH     mg/dL       < 150.0
HDL Cholesterol (Good)      38.0        LOW      mg/dL       > 40.0
LDL Cholesterol (Bad)      147.6        HIGH     mg/dL       < 100.0 (Optimal)
VLDL Cholesterol            38.4        HIGH     mg/dL       < 30.0
Cholesterol/HDL Ratio       5.89        HIGH     ratio       < 4.5

RENAL FUNCTION TEST (KIDNEY)
Serum Creatinine            0.95        NORMAL   mg/dL       0.70 - 1.30
Blood Urea Nitrogen (BUN)  16.2        NORMAL   mg/dL       7.0 - 20.0
Estimated GFR (CKD-EPI)     89.0        NORMAL   mL/min/1.73 > 60.0
Serum Uric Acid             5.4         NORMAL   mg/dL       3.5 - 7.2

COMPLETE BLOOD COUNT (CBC)
Hemoglobin                  14.6        NORMAL   g/dL        13.0 - 17.0
Total Leukocyte Count (WBC) 7,200       NORMAL   cells/mcL   4,000 - 11,000
Platelet Count              240,000     NORMAL   cells/mcL   150,000 - 450,000
Packed Cell Volume (PCV)    44.2        NORMAL   %           40.0 - 50.0

LIVER FUNCTION TEST
SGOT / AST                  26.0        NORMAL   U/L         < 40.0
SGPT / ALT                  31.0        NORMAL   U/L         < 45.0
Alkaline Phosphatase (ALP)  78.0        NORMAL   U/L         40.0 - 129.0
Total Bilirubin             0.7         NORMAL   mg/dL       0.2 - 1.2

--------------------------------------------------------------------------------
PATHOLOGIST REMARKS & CLINICAL INTERPRETATION:
1. Fasting and postprandial hyperglycemia with HbA1c of 8.2% indicates suboptimal
   glycemic control over the past 90 days. Clinical correlation with medication
   adherence and dietary regimen recommended.
2. Atherogenic dyslipidemia pattern noted: elevated Total Cholesterol, LDL-C,
   Triglycerides, and borderline low HDL-C.
3. Renal and Hepatic functions are currently within normal baseline limits.

Verified by:
Dr. Ananya Sengupta, MD (Pathology)
Senior Consultant Pathologist
Registration No: KMC-31849`,
  },
  {
    id: 'sample-discharge-summary',
    name: 'Manipal Hospital Discharge Summary',
    badge: 'Discharge Summary',
    description: 'Inpatient stay for acute bronchitis, medication taper & warning signs',
    filename: 'Sample_Discharge_Summary_Manipal.txt',
    mimeType: 'text/plain',
    content: `MANIPAL HOSPITALS - WHITEFIELD
Department of Pulmonology & Critical Care
Whitefield Main Road, Bangalore, Karnataka - 560066

================================================================================
INPATIENT DISCHARGE SUMMARY
================================================================================

PATIENT IDENTIFICATION:
Patient Name: Rajesh Kumar               IP Number: IP-2026-04182
Age / Gender: 52 Years / Male           UHID: MH-8821039
Admission Date: 2026-02-18 10:15 AM      Discharge Date: 2026-02-21 02:00 PM
Consultant: Dr. Vikram Deshmukh, MD, DM (Pulmonology)

FINAL DIAGNOSES:
1. Acute Exacerbation of Bronchitis with Bronchospasm
2. Pre-existing Type 2 Diabetes Mellitus
3. Mild Systemic Hypertension

CHIEF COMPLAINTS AT ADMISSION:
- Productive cough with yellowish sputum for 5 days
- Progressive shortness of breath on exertion (mMRC Grade II)
- Low-grade fever (100.4°F) for 3 days
- Chest tightness and nocturnal wheezing

HOSPITAL COURSE & TREATMENT SUMMARY:
Patient presented with dyspnea and productive cough. Chest X-Ray on admission
demonstrated bilateral peribronchial cuffing without focal consolidation or pleural effusion.
He was treated with intravenous bronchodilators, short course IV Hydrocortisone,
nebulization (Levosalbutamol + Ipratropium), and empirical antibiotic therapy
(Azithromycin 500mg IV OD for 3 days). Glycemic levels were monitored and managed
with regular insulin sliding scale during the acute steroid phase.
Patient responded well with clinical resolution of bronchospasm, clear lung fields,
and normal SpO2 (98% on room air). Afebrile for 48 hours prior to discharge.

DISCHARGE MEDICATIONS:
--------------------------------------------------------------------------------
1. Tab. Cefuroxime Axetil 500 mg
   - Dosage: 1 tablet twice daily (BD) after food for 5 more days (Total: 7 days)
2. Inhaler Budesonide + Formoterol (200/6 mcg)
   - Route: Metered Dose Inhaler with Spacer
   - Dosage: 2 puffs twice daily for 30 days, then taper as per clinic review
3. Tab. Montelukast 10 mg + Levocetirizine 5 mg
   - Dosage: 1 tablet at bedtime (OD) for 14 days
4. Resume baseline anti-diabetic and anti-hypertensive regimen (Metformin & Lisinopril)

HOME CARE & WARNING SIGNS:
- Continue steam inhalation twice daily.
- Avoid exposure to dust, smoke, and cold air.
- Seek immediate medical attention at Emergency if experiencing:
  * Persistent high-grade fever (> 101°F)
  * Increased shortness of breath at rest or drop in SpO2 < 94%
  * Chest pain or hemoptysis (blood in sputum)

FOLLOW-UP APPOINTMENT:
Review with Dr. Vikram Deshmukh in Pulmonology OPD on February 28, 2026 at 11:00 AM.
Repeat Peak Expiratory Flow Rate (PEFR) and spirometry scheduled.

Prepared by: Dr. Rohit Verma, Resident Medical Officer
Approved by: Dr. Vikram Deshmukh, Senior Consultant Pulmonologist`,
  },
];
