const pool = require('../../config/database');

class BaseModel {
  static async query(text, params) {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  }
}

class User extends BaseModel {
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await super.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await super.query(query, [email]);
    return result.rows[0];
  }

  static async create(userData) {
    const { email, password_hash, first_name, last_name, role = 'planner' } = userData;
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await super.query(query, [email, password_hash, first_name, last_name, role]);
    return result.rows[0];
  }
}

class Client extends BaseModel {
  static async create(clientData) {
    const {
      assigned_planner_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      marital_status,
      gohighlevel_contact_id
    } = clientData;

    const query = `
      INSERT INTO clients (
        assigned_planner_id, first_name, last_name, email, phone, 
        date_of_birth, marital_status, gohighlevel_contact_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await super.query(query, [
      assigned_planner_id, first_name, last_name, email, phone, 
      date_of_birth, marital_status, gohighlevel_contact_id
    ]);
    
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM clients WHERE id = $1';
    const result = await super.query(query, [id]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM clients WHERE email = $1';
    const result = await super.query(query, [email]);
    return result.rows[0];
  }

  static async findByGoHighLevelId(gohighlevel_contact_id) {
    const query = 'SELECT * FROM clients WHERE gohighlevel_contact_id = $1';
    const result = await super.query(query, [gohighlevel_contact_id]);
    return result.rows[0];
  }
}

class Assessment extends BaseModel {
  static async create(assessmentData) {
    const {
      client_id,
      user_id,
      assessment_type,
      assessment_data,
      eligibility_result,
      recommendations
    } = assessmentData;

    const query = `
      INSERT INTO assessments (
        client_id, user_id, assessment_type, assessment_data,
        eligibility_result, recommendations
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await super.query(query, [
      client_id, user_id, assessment_type,
      JSON.stringify(assessment_data),
      JSON.stringify(eligibility_result),
      JSON.stringify(recommendations)
    ]);
    
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM assessments WHERE assessment_id = $1';
    const result = await super.query(query, [id]);
    const assessment = result.rows[0];
    
    if (assessment) {
      assessment.assessment_data = JSON.parse(assessment.assessment_data || '{}');
      assessment.eligibility_result = JSON.parse(assessment.eligibility_result || '{}');
      assessment.recommendations = JSON.parse(assessment.recommendations || '[]');
    }
    
    return assessment;
  }

  static async findByClientId(client_id) {
    const query = 'SELECT * FROM assessments WHERE client_id = $1 ORDER BY created_at DESC';
    const result = await super.query(query, [client_id]);
    
    return result.rows.map(assessment => {
      assessment.assessment_data = JSON.parse(assessment.assessment_data || '{}');
      assessment.eligibility_result = JSON.parse(assessment.eligibility_result || '{}');
      assessment.recommendations = JSON.parse(assessment.recommendations || '[]');
      return assessment;
    });
  }
}

class Plan extends BaseModel {
  static async create(planData) {
    const {
      assessment_id,
      client_id,
      user_id,
      plan_type,
      plan_data,
      implementation_steps,
      priority_score
    } = planData;

    const query = `
      INSERT INTO plans (
        assessment_id, client_id, user_id, plan_type, plan_data,
        implementation_steps, priority_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await super.query(query, [
      assessment_id, client_id, user_id, plan_type,
      JSON.stringify(plan_data),
      JSON.stringify(implementation_steps),
      priority_score
    ]);
    
    return result.rows[0];
  }

  static async findByAssessmentId(assessment_id) {
    const query = 'SELECT * FROM plans WHERE assessment_id = $1 ORDER BY priority_score DESC';
    const result = await super.query(query, [assessment_id]);
    
    return result.rows.map(plan => {
      plan.plan_data = JSON.parse(plan.plan_data || '{}');
      plan.implementation_steps = JSON.parse(plan.implementation_steps || '[]');
      return plan;
    });
  }
}

class Report extends BaseModel {
  static async create(reportData) {
    const {
      assessment_id,
      client_id,
      user_id,
      report_type,
      report_data,
      file_path,
      share_token
    } = reportData;

    const query = `
      INSERT INTO reports (
        assessment_id, client_id, user_id, report_type, report_data,
        file_path, share_token
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await super.query(query, [
      assessment_id, client_id, user_id, report_type,
      JSON.stringify(report_data),
      file_path, share_token
    ]);
    
    return result.rows[0];
  }

  static async findByShareToken(share_token) {
    const query = `
      SELECT r.*, c.first_name, c.last_name, c.email
      FROM reports r
      JOIN clients c ON r.client_id = c.client_id
      WHERE r.share_token = $1
    `;
    const result = await super.query(query, [share_token]);
    const report = result.rows[0];
    
    if (report) {
      report.report_data = JSON.parse(report.report_data || '{}');
    }
    
    return report;
  }

  static async findByClientId(client_id) {
    const query = 'SELECT * FROM reports WHERE client_id = $1 ORDER BY created_at DESC';
    const result = await super.query(query, [client_id]);
    
    return result.rows.map(report => {
      report.report_data = JSON.parse(report.report_data || '{}');
      return report;
    });
  }
}

class BenefitRules extends BaseModel {
  static async findByStateAndProgram(state, program, year = 2025) {
    const query = 'SELECT * FROM benefit_rules WHERE state = $1 AND program = $2 AND year = $3';
    const result = await super.query(query, [state.toUpperCase(), program.toLowerCase(), year]);
    const rule = result.rows[0];
    
    if (rule && rule.program_details && typeof rule.program_details === 'string') {
      rule.program_details = JSON.parse(rule.program_details);
    }
    
    return rule;
  }

  static async findByState(state, year = 2025) {
    const query = 'SELECT * FROM benefit_rules WHERE state = $1 AND year = $2 ORDER BY program';
    const result = await super.query(query, [state.toUpperCase(), year]);
    
    return result.rows.map(rule => {
      if (rule.program_details && typeof rule.program_details === 'string') {
        rule.program_details = JSON.parse(rule.program_details);
      }
      return rule;
    });
  }

  static async findAllByProgram(program, year = 2025) {
    const query = 'SELECT * FROM benefit_rules WHERE program = $1 AND year = $2 ORDER BY state';
    const result = await super.query(query, [program.toLowerCase(), year]);
    
    return result.rows.map(rule => {
      if (rule.program_details && typeof rule.program_details === 'string') {
        rule.program_details = JSON.parse(rule.program_details);
      }
      return rule;
    });
  }
}

class EstateRecoveryRules extends BaseModel {
  static async findByState(state) {
    const query = 'SELECT * FROM estate_recovery_rules WHERE state = $1';
    const result = await super.query(query, [state.toUpperCase()]);
    return result.rows[0];
  }

  static async findByRecoveryAggressiveness(aggressiveness) {
    const query = 'SELECT * FROM estate_recovery_rules WHERE recovery_aggressiveness = $1 ORDER BY state';
    const result = await super.query(query, [aggressiveness]);
    return result.rows;
  }

  static async findByHomeProtection(protection_level) {
    const query = 'SELECT * FROM estate_recovery_rules WHERE home_protection_strength = $1 ORDER BY state';
    const result = await super.query(query, [protection_level]);
    return result.rows;
  }

  static async findBestHomeProtectionStates() {
    const query = `
      SELECT state, home_protection_strength, recovery_aggressiveness, protected_assets 
      FROM estate_recovery_rules 
      WHERE home_protection_strength IN ('very_strong', 'strong')
      ORDER BY 
        CASE home_protection_strength 
          WHEN 'very_strong' THEN 1 
          WHEN 'strong' THEN 2 
          ELSE 3 
        END,
        state
    `;
    const result = await super.query(query, []);
    return result.rows;
  }
}

module.exports = {
  User,
  Client,
  Assessment,
  Plan,
  Report,
  BenefitRules,
  EstateRecoveryRules
};