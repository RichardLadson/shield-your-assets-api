const {
  assessPostEligibilityNeeds,
  determinePostEligibilityStrategies,
  planPostEligibilityApproach,
  medicaidPostEligibilityPlanning
} = require('../postEligibilityPlanning');

describe('Post-Eligibility Planning Module', () => {
  const clientInfo = {
    age: 70,
    maritalStatus: 'single',
    homeOwnership: false,
    state: 'florida'
  };

  const assets = {
    total: 21000,
    countable: 2000
  };

  const income = {
    monthly: 2000
  };

  const state = 'florida';

  describe('assessPostEligibilityNeeds', () => {
    test('should assess post-eligibility needs correctly for single client', () => {
      const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, 'single');
      expect(needs).toHaveProperty('monthlyLiabilityManagement');
      expect(needs).toHaveProperty('annualRedetermination');
    });

    test('should identify asset retitling needs for married clients with savings', () => {
      const needs = assessPostEligibilityNeeds(clientInfo, assets, income, state, 'married');
      expect(needs.assetRetitling).toBe(true);
      expect(needs.spousalAllowanceReview).toBe(true);
    });

    test('should identify potential move when applicable', () => {
      const clientInfoWithMove = { ...clientInfo, potentialRelocation: true };
      const needs = assessPostEligibilityNeeds(clientInfoWithMove, assets, income, state, 'single');
      expect(needs.potentialMove).toBe(true);
    });
  });

  describe('determinePostEligibilityStrategies', () => {
    const needs = {
      assetRetitling: true,
      spousalAllowanceReview: true,
      potentialMove: true
    };

    test('should recommend basic strategies for all clients', () => {
      const strategies = determinePostEligibilityStrategies(needs);
      expect(strategies).toContain('Set up monthly income tracking and review');
      expect(strategies).toContain('Apply excess income toward patient liability consistently');
    });

    test('should recommend asset retitling when needed', () => {
      const strategies = determinePostEligibilityStrategies(needs);
      expect(strategies).toContain('Retitle Community Spouse Resource Allowance (CSRA) assets');
    });

    test('should recommend spousal income allowance review when married', () => {
      const strategies = determinePostEligibilityStrategies(needs);
      expect(strategies).toContain('Review and adjust spousal income allowances if necessary');
    });

    test('should recommend relocation planning when applicable', () => {
      const strategies = determinePostEligibilityStrategies(needs);
      expect(strategies).toContain('Plan for potential relocation and review new state Medicaid rules');
    });
  });

  describe('planPostEligibilityApproach', () => {
    const strategies = ['Set up monthly income tracking and review'];
    const situation = {
      totalIncome: 2000,
      totalExpenses: 2300,
      patientLiability: 0,
      state: 'florida'
    };

    test('should create detailed plan based on strategies', () => {
      const plan = planPostEligibilityApproach(strategies, situation);
      expect(plan).toContain('Monthly Income: $2000.00');
      expect(plan).toContain('Estimated Patient Liability: $0.00');
    });
  });

  test('medicaidPostEligibilityPlanning should complete the post-eligibility planning process successfully', async () => {
    const result = await medicaidPostEligibilityPlanning(clientInfo, assets, income, state, 'single');
    expect(result.status).toBe('success');
    expect(result).toHaveProperty('needs');
    expect(result).toHaveProperty('strategies');
    expect(result).toHaveProperty('approach');
  });
});
