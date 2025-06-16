#!/usr/bin/env node

/**
 * Additional Enhanced Strategy Data Population Script
 * Adds more strategies from the user's comprehensive database
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

// Additional enhanced strategies from user's database_update.txt
const additionalStrategies = [
  {
    formal_name: "Community Spouse Resource Allowance (CSRA) Maximization",
    friendly_name: "Protect Your Spouse's Financial Security",
    category: "Community Spouse",
    timing_category: "immediate",
    badge_color: "purple",
    badge_text: "💜 SPOUSE - Married Couples Only",
    savings_description: "Up to $154,140 for your spouse",
    emotional_hook: "Your spouse shouldn't become financially devastated just because you need care. Federal law protects them - we make sure they get every dollar they deserve.",
    plain_english_explanation: "When you're married and need Medicaid, your healthy spouse gets to keep a significant amount of assets - up to $154,140 in 2024. This isn't charity, it's federal law. We ensure your spouse gets the maximum protection available and knows exactly how to manage these protected assets.",
    real_benefits: [
      {
        title: "Federal law protection",
        description: "Government guarantees your spouse can keep these assets"
      },
      {
        title: "Immediate effect",
        description: "No waiting period - protection starts right away"
      },
      {
        title: "Complete control",
        description: "Your spouse maintains full control over protected money"
      },
      {
        title: "No restrictions",
        description: "Spouse can spend, invest, or save as they choose"
      },
      {
        title: "Quality of life",
        description: "Ensures your spouse can maintain their lifestyle"
      }
    ],
    what_to_know: [
      "Only available for married couples",
      "Amount protected depends on total assets at time of application",
      "We can help maximize the protection through proper planning",
      "Spouse must understand their rights and responsibilities"
    ],
    effectiveness_metrics: {
      success_rate: "100%",
      protection_amount: "Up to $154,140",
      time_to_implement: "At application"
    },
    bottom_line: "Every married couple should know about this protection - it's guaranteed by federal law.",
    effectiveness_score: 9,
    sort_order: 6
  },
  {
    formal_name: "Monthly Maintenance Needs Allowance (MMNA) Optimization",
    friendly_name: "Boost Your Spouse's Monthly Income Protection",
    category: "Community Spouse",
    timing_category: "immediate",
    badge_color: "purple",
    badge_text: "💜 SPOUSE - Income Protection",
    savings_description: "Up to $3,853 monthly income protection",
    emotional_hook: "Your spouse deserves enough monthly income to live with dignity. We fight to get them every dollar they're entitled to under federal law.",
    plain_english_explanation: "Federal law guarantees your healthy spouse a minimum monthly income allowance - currently between $2,465 and $3,853 per month. If your spouse's income falls below this, they can receive money from your income to bring them up to the protected level. We help maximize this allowance through proper documentation and appeals.",
    real_benefits: [
      {
        title: "Guaranteed monthly income",
        description: "Federal minimums your spouse is entitled to receive"
      },
      {
        title: "Reduces your costs",
        description: "Less of your income goes to nursing home"
      },
      {
        title: "Legal entitlement",
        description: "Not charity - this is federal law"
      },
      {
        title: "Can be increased",
        description: "We can appeal for higher amounts with documentation"
      },
      {
        title: "Immediate protection",
        description: "Starts as soon as Medicaid begins"
      }
    ],
    what_to_know: [
      "Requires detailed expense documentation",
      "Higher amounts possible through fair hearing process",
      "Shelter costs especially important for increases",
      "Professional advocacy significantly improves outcomes"
    ],
    effectiveness_metrics: {
      success_rate: "95%",
      protection_amount: "$2,465-$3,853/month",
      time_to_implement: "2-6 weeks"
    },
    bottom_line: "Every extra dollar your spouse keeps is one less dollar lost to care costs.",
    effectiveness_score: 8,
    sort_order: 7
  },
  {
    formal_name: "Primary Residence Protection Strategy",
    friendly_name: "Keep Your Family Home Safe",
    category: "Asset Planning",
    timing_category: "immediate",
    badge_color: "orange",
    badge_text: "🟠 HOME - Property Protection",
    savings_description: "Protect home equity up to $955,000",
    emotional_hook: "Your family home represents a lifetime of memories and financial security. You can protect it while still getting the care you need.",
    plain_english_explanation: "Your primary residence is protected from Medicaid as long as you intend to return home or your spouse lives there. Home equity up to $955,000 (in 2024) doesn't count against Medicaid eligibility. We help document your intent properly and protect against estate recovery after death.",
    real_benefits: [
      {
        title: "Significant protection",
        description: "Up to $955,000 in home equity protected"
      },
      {
        title: "Family security",
        description: "Spouse can continue living in the home"
      },
      {
        title: "Intent protection",
        description: "Protected as long as you intend to return"
      },
      {
        title: "No time limit",
        description: "Protection continues throughout care"
      },
      {
        title: "Estate planning options",
        description: "Additional strategies to protect for heirs"
      }
    ],
    what_to_know: [
      "Must be your primary residence",
      "Intent to return must be documented",
      "Estate recovery may apply after death",
      "Additional planning needed to protect heirs"
    ],
    effectiveness_metrics: {
      success_rate: "98%",
      protection_amount: "Up to $955,000",
      time_to_implement: "Immediate"
    },
    bottom_line: "Your home can be protected during your lifetime - additional planning protects your heirs.",
    effectiveness_score: 9,
    sort_order: 8
  },
  {
    formal_name: "Half-a-Loaf Strategy",
    friendly_name: "Give Half, Save Half - Advanced Asset Protection",
    category: "Asset Planning",
    timing_category: "short_term",
    badge_color: "red",
    badge_text: "🔴 ADVANCED - Professional Guidance Required",
    savings_description: "Protect approximately 50% of excess assets",
    emotional_hook: "What if you could give away half your money to family and still qualify for benefits? This sophisticated strategy makes it possible.",
    plain_english_explanation: "This advanced strategy involves gifting exactly half of your excess assets to family while using the other half to purchase an annuity that covers the penalty period. The result: you qualify for Medicaid while protecting approximately 50% of your assets for your family. Requires precise calculations and professional execution.",
    real_benefits: [
      {
        title: "Significant asset protection",
        description: "Typically saves about 50% of excess assets"
      },
      {
        title: "Family inheritance",
        description: "Gifts go directly to family members"
      },
      {
        title: "Calculated approach",
        description: "Precise timing minimizes penalty exposure"
      },
      {
        title: "Proven strategy",
        description: "Well-established technique with track record"
      },
      {
        title: "Professional execution",
        description: "Expert guidance ensures optimal results"
      }
    ],
    what_to_know: [
      "Requires complex calculations and precise timing",
      "Professional Medicaid planning attorney essential",
      "Not appropriate for all asset levels or situations",
      "Creates penalty period that must be funded privately"
    ],
    effectiveness_metrics: {
      success_rate: "85%",
      protection_amount: "~50% of excess assets",
      time_to_implement: "2-6 months"
    },
    bottom_line: "Sophisticated strategy that can save hundreds of thousands for families who can afford professional guidance.",
    effectiveness_score: 7,
    sort_order: 9
  },
  {
    formal_name: "Caregiver Child Exception Strategy",
    friendly_name: "Reward Your Caregiving Child",
    category: "Asset Planning",
    timing_category: "immediate",
    badge_color: "green",
    badge_text: "🟢 FAMILY - Caregiver Reward",
    savings_description: "Transfer home without penalty to caregiving child",
    emotional_hook: "Your adult child gave up years of their life to care for you at home. Federal law rewards this sacrifice by allowing penalty-free transfers.",
    plain_english_explanation: "If your adult child lived in your home and provided care for at least 2 years that kept you out of a nursing home, you can transfer your house to them without any Medicaid penalty. This recognizes their sacrifice and protects your home for the family. Requires extensive documentation but provides complete protection.",
    real_benefits: [
      {
        title: "No penalty period",
        description: "Transfer doesn't create any waiting period"
      },
      {
        title: "Complete home protection",
        description: "Entire home value protected for family"
      },
      {
        title: "Rewards family caregiving",
        description: "Recognizes child's sacrifice and dedication"
      },
      {
        title: "Avoids estate recovery",
        description: "Home protected from government claims"
      },
      {
        title: "Immediate qualification",
        description: "Can transfer and apply for Medicaid right away"
      }
    ],
    what_to_know: [
      "Child must have lived in home during caregiving period",
      "Must prove 2+ years of care that avoided nursing home",
      "Extensive documentation required",
      "Professional help essential for approval"
    ],
    effectiveness_metrics: {
      success_rate: "75%",
      protection_amount: "Full home value",
      time_to_implement: "3-6 months documentation"
    },
    bottom_line: "Rewards family caregiving while protecting your most valuable asset.",
    effectiveness_score: 8,
    sort_order: 10
  }
];

async function populateAdditionalStrategies() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🚀 Adding additional enhanced strategies...');
    
    for (const strategy of additionalStrategies) {
      // Check if strategy already exists
      const existsQuery = 'SELECT id FROM enhanced_strategies WHERE formal_name = $1';
      const existsResult = await pool.query(existsQuery, [strategy.formal_name]);
      
      if (existsResult.rows.length > 0) {
        console.log(`⏭️  Skipping existing strategy: ${strategy.formal_name}`);
        continue;
      }
      
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
      console.log(`✅ Added: ${result.rows[0].formal_name} (ID: ${result.rows[0].id})`);
    }
    
    // Get final count
    const countQuery = 'SELECT COUNT(*) as total FROM enhanced_strategies WHERE is_active = true';
    const countResult = await pool.query(countQuery);
    console.log(`\n📊 Total enhanced strategies: ${countResult.rows[0].total}`);
    
    // Show categories
    const categoryQuery = `
      SELECT category, COUNT(*) as count 
      FROM enhanced_strategies 
      WHERE is_active = true 
      GROUP BY category 
      ORDER BY category
    `;
    const categoryResult = await pool.query(categoryQuery);
    
    console.log('\n📋 Strategies by category:');
    console.table(categoryResult.rows);
    
    console.log('\n🎉 Additional enhanced strategies added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding additional strategies:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  populateAdditionalStrategies()
    .then(() => {
      console.log('✅ Additional strategy population completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Additional strategy population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateAdditionalStrategies };