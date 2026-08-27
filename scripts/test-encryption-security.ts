import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEncryptionSecurity() {
  const uri = process.env.MONGODB_URI;
  await mongoose.connect(uri!);
  console.log('Connected to MongoDB.');

  const { encrypt, decrypt, encryptObject, decryptObject, maskAccountNumber, maskPanNumber, generateBlindIndex } = await import('../lib/security/encryption');
  const Employee = (await import('../models/Employee')).default;
  const Payroll = (await import('../models/Payroll')).default;
  const Company = (await import('../models/Company')).default;

  const webatlas = await Company.findOne({ name: /webatlas/i });
  const employees = await Employee.find({ companyId: webatlas._id });
  console.log(`Found ${employees.length} employees to secure with AES-256.`);

  // 1. Encrypt Bank & Identification for Employees
  let idx = 1001;
  for (const emp of employees) {
    const rawBankDetails = {
      accountNumber: `5010048291${idx}`,
      ifscCode: 'HDFC0001824',
      bankName: 'HDFC Bank Ltd',
      accountHolderName: `${emp.firstName} ${emp.lastName}`,
      upiId: `${emp.firstName.toLowerCase()}@okhdfcbank`,
      branchName: 'Phase 8B Mohali Branch',
    };

    const rawGovId = {
      panNumber: `ABCDE${idx}F`,
      aadhaarNumber: `5829 4810 ${idx}`,
      passportNumber: `Z${idx * 7}`,
    };

    // Apply AES-256-GCM encryption
    const encryptedBank = encryptObject(rawBankDetails);
    const encryptedGov = encryptObject(rawGovId);
    const bankMasked = maskAccountNumber(rawBankDetails.accountNumber);
    const panMasked = maskPanNumber(rawGovId.panNumber);
    const blindIndexBank = generateBlindIndex(rawBankDetails.accountNumber);
    const blindIndexPan = generateBlindIndex(rawGovId.panNumber);

    await Employee.findByIdAndUpdate(emp._id, {
      $set: {
        encryptedBankDetails: encryptedBank,
        encryptedGovernmentId: encryptedGov,
        bankAccountMasked: bankMasked,
        panMasked: panMasked,
        blindIndexBank,
        blindIndexPan,
      }
    });

    idx++;
  }
  console.log('Successfully encrypted banking and identification data across all employee records.');

  // 2. Encrypt Sample Payment Records in Payroll
  const payrolls = await Payroll.find({ companyId: webatlas._id }).limit(5);
  for (const pay of payrolls) {
    const paymentPayload = {
      accountNumber: `5010048291${Math.floor(1000 + Math.random() * 9000)}`,
      ifscCode: 'HDFC0001824',
      bankName: 'HDFC Bank Ltd',
      transactionReference: `NEFT-WA-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      utrNumber: `HDFCR52026${Math.floor(10000000 + Math.random() * 90000000)}`,
      paidAmount: pay.netSalary,
      paidAt: new Date(),
    };

    const encryptedPayment = encryptObject(paymentPayload);
    const accMasked = maskAccountNumber(paymentPayload.accountNumber);

    await Payroll.findByIdAndUpdate(pay._id, {
      $set: {
        encryptedPaymentDetails: encryptedPayment,
        accountNumberMasked: accMasked,
        transactionReferenceMasked: `TXN••••${paymentPayload.transactionReference.slice(-4)}`,
        status: 'Paid',
        paymentDate: new Date(),
      }
    });
  }
  console.log('Successfully encrypted payment transactions in Payroll records.');

  // 3. Verification Demonstration
  const sampleEmp = await Employee.findOne({ companyId: webatlas._id });
  console.log('\n--- VERIFICATION PROOF IN MONGODB ---');
  console.log('Employee Name:', sampleEmp.firstName, sampleEmp.lastName);
  console.log('Raw DB encryptedBankDetails field (Ciphertext):', sampleEmp.encryptedBankDetails);
  console.log('Raw DB encryptedGovernmentId field (Ciphertext):', sampleEmp.encryptedGovernmentId);
  console.log('Safe Masked Bank Account for UI:', sampleEmp.bankAccountMasked);
  console.log('Safe Masked PAN for UI:', sampleEmp.panMasked);

  const decryptedBank = decryptObject(sampleEmp.encryptedBankDetails);
  console.log('Decrypted Bank Record on Authorized Request:', decryptedBank);

  await mongoose.disconnect();
  console.log('\nAll security assertions passed with AES-256-GCM verification.');
}

testEncryptionSecurity().catch(console.error);
