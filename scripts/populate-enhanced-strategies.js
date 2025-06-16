#!/usr/bin/env node

/**
 * Enhanced Strategy Data Population Script
 * Populates the enhanced_strategies table with user's enhanced strategy data
 */

const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Enhanced strategy data based on user's database_update.txt file
const enhancedStrategies = [
  {
    id: 1,
    formal_name: "Irrevocable Trust Planning",
    friendly_name: "Build Your Family's Financial Fortress",
    category: "Asset Planning",
    timing_category: "long_term",
    badge_color: "yellow",
    badge_text: "🟡 LONG-TERM - Plan Ahead",
    savings_description: "Unlimited asset protection after 5 years",
    emotional_hook: "Imagine knowing that no matter what health challenges come, your life's work is protected for your children and grandchildren.",
    plain_english_explanation: "Think of this as a financial safe that protects your money from nursing home costs. You place assets in this special trust today, and after 5 years, they're completely protected - no matter how much care costs. You can even receive income from the trust while getting Medicaid benefits.",
    real_benefits: [
      {
        title: "Complete asset protection",
        description: "After 5 years, these assets don't count"
      },
      {
        title: "Protect unlimited amounts",
        description: "No caps on what you can shield"
      },
      {
        title: "Professional management",
        description: "Your money is invested and managed by experts"
      },
      {
        title: "Income if needed",
        description: "Can be structured to provide you income"
      },
      {
        title: "Estate tax benefits",
        description: "May reduce taxes for your heirs too"
      }
    ],
    what_to_know: [
      "5-year waiting period before full protection kicks in",
      "You can't change your mind once it's set up (that's what makes it work)",
      "Setup costs around $3,000-5,000 for attorney fees",
      "Best for those who can plan 5+ years ahead"
    ],
    effectiveness_metrics: {
      success_rate: "95%",
      protection_amount: "Unlimited",
      time_to_implement: "5 years"
    },
    bottom_line: "If you can plan 5 years ahead, this protects everything - your home, savings, and legacy.",
    effectiveness_score: 8,
    sort_order: 1
  },
  {
    id: 2,
    formal_name: "Spousal Transfer Strategy",
    friendly_name: "Keep Half Your Money Tomorrow",
    category: "Asset Planning",
    timing_category: "immediate",
    badge_color: "green",
    badge_text: "🟢 IMMEDIATE - No Waiting!",
    savings_description: "Up to $154,140 instantly",
    emotional_hook: "You shouldn't have to choose between getting care and leaving your spouse financially secure. This strategy ensures you don't have to.",
    plain_english_explanation: "Because you're married, you can transfer assets to your spouse TODAY without any penalty or waiting period. The government recognizes that your healthy spouse needs money to live on. We help you transfer exactly the right amount to protect the maximum while ensuring you qualify for benefits.",
    real_benefits: [
      {
        title: "Instant protection",
        description: "No 5-year waiting period like other strategies"
      },
      {
        title: "Your spouse keeps control",
        description: "Money stays in the family, accessible when needed"
      },
      {
        title: "Up to $154,140 protected",
        description: "Federal law guarantees this protection"
      },
      {
        title: "Simple process",
        description: "Can be completed in days, not years"
      },
      {
        title: "Preserves your dignity",
        description: "Qualify for benefits without becoming destitute"
      }
    ],
    what_to_know: [
      "You must be married - this doesn't work for single individuals",
      "Your spouse's assets will be protected up to federal limits",
      "We'll need to document the transfers properly",
      "If your spouse passes away first, we'll need backup planning"
    ],
    effectiveness_metrics: {
      success_rate: "98%",
      protection_amount: "Up to $154,140",
      time_to_implement: "1-2 weeks"
    },
    bottom_line: "This one strategy alone saves most married couples over $100,000 - and you can do it tomorrow.",
    effectiveness_score: 7,
    sort_order: 2
  },
  {
    id: 3,
    formal_name: "Asset Conversion Strategy",
    friendly_name: "Turn Countable Cash into Protected Assets",
    category: "Asset Planning",
    timing_category: "immediate",
    badge_color: "green",
    badge_text: "🟢 IMMEDIATE - No Waiting!",
    savings_description: "Protect assets by converting them smartly",
    emotional_hook: "What if you could keep your money's value while making it 'invisible' to Medicaid? You can.",
    plain_english_explanation: "Medicaid doesn't count everything you own. We help you convert savings into things Medicaid ignores - like home improvements, a reliable car, or prepaid funeral expenses. Your money still benefits you and your family, but now it doesn't count against you.",
    real_benefits: [
      {
        title: "Keep your money's value",
        description: "Convert cash to things that improve your life"
      },
      {
        title: "No waiting period",
        description: "These conversions work immediately"
      },
      {
        title: "Improve your quality of life",
        description: "New car, home updates, or other necessities"
      },
      {
        title: "100% legal and encouraged",
        description: "Using allowed exemptions the right way"
      },
      {
        title: "Flexible options",
        description: "Choose what makes sense for your family"
      }
    ],
    what_to_know: [
      "Purchases must be for legitimate needs",
      "We'll help you choose the best exempt assets",
      "Some states have different rules about what's exempt",
      "Documentation is important for all conversions"
    ],
    effectiveness_metrics: {
      success_rate: "90%",
      protection_amount: "Varies by need",
      time_to_implement: "1-4 weeks"
    },
    bottom_line: "Smart spending today means keeping more of your money while still qualifying for benefits.",
    effectiveness_score: 6,
    sort_order: 3
  },
  {
    id: 4,
    formal_name: "Medicaid-Compliant Annuity",
    friendly_name: "Transform Savings into Protected Income",
    category: "Asset Planning",
    timing_category: "immediate",
    badge_color: "green",
    badge_text: "🟢 IMMEDIATE - No Waiting!",
    savings_description: "Convert excess assets to guaranteed income",
    emotional_hook: "Turn your 'excess' savings into a guaranteed paycheck that doesn't disqualify you from benefits.",
    plain_english_explanation: "Instead of spending down your savings, convert them into a special type of annuity that pays you (or your spouse) monthly income. It's like creating your own pension that Medicaid approves of. The money is still working for your family, just in a different form.",
    real_benefits: [
      {
        title: "Guaranteed monthly payments",
        description: "Turn a lump sum into steady income"
      },
      {
        title: "Immediate qualification",
        description: "Can help you qualify for Medicaid right away"
      },
      {
        title: "Spouse protection",
        description: "Payments can go to your healthy spouse"
      },
      {
        title: "Professional products",
        description: "Insurance companies handle all the details"
      },
      {
        title: "Medicaid approved",
        description: "Structured to meet all government requirements"
      }
    ],
    what_to_know: [
      "Must meet very specific Medicaid requirements",
      "Once purchased, you can't change your mind",
      "Professional guidance essential for proper structure",
      "Not appropriate for all situations"
    ],
    effectiveness_metrics: {
      success_rate: "95%",
      protection_amount: "Varies by purchase",
      time_to_implement: "2-4 weeks"
    },
    bottom_line: "Convert excess assets into family income while qualifying for benefits - legally and immediately.",
    effectiveness_score: 8,
    sort_order: 4
  },
  {
    id: 5,
    formal_name: "Qualified Income Trust (Miller Trust)",
    friendly_name: "The Income Solution for Benefit Qualification",
    category: "Income Planning",
    timing_category: "immediate",
    badge_color: "blue",
    badge_text: "🔵 INCOME - Required in Many States",
    savings_description: "Qualify despite excess income",
    emotional_hook: "Your income is 'too high' for benefits by just $200/month? This legal solution fixes that problem.",
    plain_english_explanation: "In many states, if your monthly income exceeds the limit by even $1, you can't get Medicaid. A Miller Trust solves this by legally redirecting your excess income so you qualify. Think of it as a special bank account that makes your income 'look right' to Medicaid.",
    real_benefits: [
      {
        title: "Instant income qualification",
        description: "Qualify even with income over the limit"
      },
      {
        title: "Required in many states",
        description: "The only way to qualify in income cap states"
      },
      {
        title: "Professional management",
        description: "Trust company handles all the details"
      },
      {
        title: "Family protection",
        description: "Excess income can benefit spouse or family"
      },
      {
        title: "Government approved",
        description: "Specifically allowed under federal law"
      }
    ],
    what_to_know: [
      "Required in states with income caps (about 40 states)",
      "Must be set up before applying for Medicaid",
      "Monthly administration fees apply",
      "Professional trustee manages the account"
    ],
    effectiveness_metrics: {
      success_rate: "99%",
      protection_amount: "Income qualification",
      time_to_implement: "2-3 weeks"
    },
    bottom_line: "If your income is 'too high,' this is often the only way to qualify for benefits.",
    effectiveness_score: 9,
    sort_order: 5
  }
];

async function populateEnhancedStrategies() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Starting enhanced strategies data population...');
    
    // Clear existing data (for clean import)
    console.log('🧹 Clearing existing enhanced strategies...');
    await pool.query('DELETE FROM enhanced_strategies');
    
    // Reset sequence
    await pool.query('ALTER SEQUENCE enhanced_strategies_id_seq RESTART WITH 1');
    
    console.log('📝 Inserting enhanced strategy data...');
    
    for (const strategy of enhancedStrategies) {
      const insertQuery = `
        INSERT INTO enhanced_strategies (
          formal_name, friendly_name, category, timing_category, badge_color, badge_text,
          savings_description, emotional_hook, plain_english_explanation, real_benefits,
          what_to_know, effectiveness_metrics, bottom_line, effectiveness_score, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, formal_name;
      `;
      
      const values = [
        strategy.formal_name,
        strategy.friendly_name,
        strategy.category,
        strategy.timing_category,
        strategy.badge_color,
        strategy.badge_text,
        strategy.savings_description,
        strategy.emotional_hook,
        strategy.plain_english_explanation,
        JSON.stringify(strategy.real_benefits),
        strategy.what_to_know,
        JSON.stringify(strategy.effectiveness_metrics),
        strategy.bottom_line,
        strategy.effectiveness_score,
        strategy.sort_order
      ];
      
      const result = await pool.query(insertQuery, values);
      console.log(`✅ Inserted: ${result.rows[0].formal_name} (ID: ${result.rows[0].id})`);
    }
    
    // Verify the data
    const countQuery = 'SELECT COUNT(*) as total FROM enhanced_strategies';
    const countResult = await pool.query(countQuery);
    console.log(`\n📊 Total strategies inserted: ${countResult.rows[0].total}`);
    
    // Show sample data
    const sampleQuery = `
      SELECT id, formal_name, friendly_name, category, timing_category, effectiveness_score
      FROM enhanced_strategies 
      ORDER BY sort_order 
      LIMIT 5
    `;
    const sampleResult = await pool.query(sampleQuery);
    
    console.log('\n📋 Sample inserted data:');
    console.table(sampleResult.rows);
    
    console.log('\n🎉 Enhanced strategies data population complete!');
    
  } catch (error) {
    console.error('❌ Error populating enhanced strategies:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  populateEnhancedStrategies()
    .then(() => {
      console.log('✅ Data population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateEnhancedStrategies };