// HTML Templates for Enhanced Medicaid Reports

/**
 * Generate the complete enhanced eligibility HTML report
 */
function generateEnhancedEligibilityHTML(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.header.title}</title>
    ${getReportCSS()}
</head>
<body>
    <div class="report-container">
        ${generateHeaderSection(data.header)}
        ${generateCriticalAlert(data.criticalAlert)}
        ${generateStatusGrid(data.statusGrid)}
        ${generateAssetBreakdown(data.assetBreakdown)}
        ${generateTimeline(data.timeline)}
        ${generateStateAdvantages(data.stateAdvantages)}
        ${generateLookbackSection(data.lookbackPeriod)}
        ${generateIncomeDetails(data.incomeDetails)}
        ${generateComparisonTable(data.comparison)}
        ${generateActionItems(data.actionItems)}
        ${generateStateQA(data.stateQA)}
        ${generateBottomLine(data.bottomLine)}
    </div>
</body>
</html>`;
}

/**
 * Generate embedded version for React components (no html/body tags)
 */
function generateEmbeddedEligibilityHTML(data) {
  return `
    <style>
        ${getReportCSSContent()}
    </style>
    <div class="report-container">
        ${generateHeaderSection(data.header)}
        ${generateCriticalAlert(data.criticalAlert)}
        ${generateStatusGrid(data.statusGrid)}
        ${generateAssetBreakdown(data.assetBreakdown)}
        ${generateTimeline(data.timeline)}
        ${generateStateAdvantages(data.stateAdvantages)}
        ${generateLookbackSection(data.lookbackPeriod)}
        ${generateIncomeDetails(data.incomeDetails)}
        ${generateComparisonTable(data.comparison)}
        ${generateActionItems(data.actionItems)}
        ${generateStateQA(data.stateQA)}
        ${generateBottomLine(data.bottomLine)}
    </div>`;
}

/**
 * CSS styles for the report
 */
function getReportCSS() {
  return `<style>
        ${getReportCSSContent()}
    </style>`;
}

/**
 * CSS content only (for embedding)
 */
function getReportCSSContent() {
  return `
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2c5aa0;
            padding-bottom: 20px;
        }
        
        h1 {
            color: #2c5aa0;
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 18px;
        }
        
        /* Critical Alert Box */
        .critical-alert {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .critical-alert.urgent {
            background: #f8d7da;
            border-color: #dc3545;
        }
        
        .critical-alert h3 {
            color: #856404;
            margin-top: 0;
            font-size: 20px;
        }
        
        .critical-alert.urgent h3 {
            color: #721c24;
        }
        
        .critical-alert p {
            color: #856404;
            margin-bottom: 0;
        }
        
        .critical-alert.urgent p {
            color: #721c24;
        }
        
        /* Status Overview Grid */
        .status-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        
        .status-card {
            border-radius: 8px;
            padding: 25px;
            text-align: center;
        }
        
        .status-qualified {
            background: #d4edda;
            border: 2px solid #28a745;
        }
        
        .status-over {
            background: #f8d7da;
            border: 2px solid #dc3545;
        }
        
        .status-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        
        .status-qualified .status-title {
            color: #155724;
        }
        
        .status-over .status-title {
            color: #721c24;
        }
        
        .status-amount {
            font-size: 28px;
            font-weight: bold;
            margin: 10px 0;
        }
        
        .status-limit {
            font-size: 16px;
            color: #666;
        }
        
        .status-message {
            font-size: 16px;
            margin-top: 10px;
            font-weight: bold;
        }
        
        /* Asset Breakdown */
        .asset-breakdown {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .asset-breakdown h3 {
            color: #2c5aa0;
            margin-bottom: 20px;
        }
        
        .asset-category {
            margin-bottom: 20px;
        }
        
        .asset-at-risk {
            color: #dc3545;
            font-size: 18px;
            font-weight: bold;
        }
        
        .asset-protected {
            color: #28a745;
            font-size: 18px;
            font-weight: bold;
        }
        
        .asset-list {
            margin-left: 20px;
            margin-top: 10px;
        }
        
        .asset-list li {
            margin: 5px 0;
        }
        
        /* Timeline Box */
        .timeline-box {
            background: #fff3cd;
            border: 2px solid #ffc107;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
        }
        
        .timeline-title {
            color: #856404;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
        }
        
        .timeline-item {
            margin: 15px 0;
            font-size: 17px;
            color: #856404;
        }
        
        .timeline-cost {
            font-size: 20px;
            font-weight: bold;
            color: #dc3545;
        }
        
        /* Florida/State Advantages */
        .florida-advantages {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .florida-advantages h3 {
            color: #1565c0;
            margin-bottom: 20px;
            font-size: 22px;
        }
        
        .advantage-item {
            margin: 10px 0;
            font-size: 16px;
            display: flex;
            align-items: flex-start;
        }
        
        .advantage-icon {
            color: #2196f3;
            font-size: 20px;
            margin-right: 10px;
            flex-shrink: 0;
        }
        
        /* Look-back Period */
        .lookback-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .lookback-title {
            color: #2c5aa0;
            font-size: 20px;
            margin-bottom: 20px;
        }
        
        .lookback-details {
            margin: 15px 0;
        }
        
        .lookback-warning {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        
        /* Income Details */
        .income-details {
            background: #d4edda;
            border: 2px solid #28a745;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .income-details.over-income {
            background: #f8d7da;
            border: 2px solid #dc3545;
        }
        
        .income-details h3 {
            color: #155724;
            margin-bottom: 20px;
        }
        
        .income-details.over-income h3 {
            color: #721c24;
        }
        
        .income-item {
            margin: 10px 0;
            font-size: 16px;
        }
        
        /* Florida Q&A */
        .florida-qa {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 25px;
            margin: 30px 0;
        }
        
        .florida-qa h3 {
            color: #2c5aa0;
            margin-bottom: 20px;
        }
        
        .qa-item {
            margin-bottom: 20px;
        }
        
        .qa-question {
            font-weight: bold;
            color: #2c5aa0;
            margin-bottom: 5px;
        }
        
        .qa-answer {
            margin-left: 20px;
            color: #555;
        }

        /* Action Items */
        .action-items {
            background: #2c5aa0;
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin: 30px 0;
        }
        
        .action-items h3 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .action-list {
            list-style: none;
            padding: 0;
        }
        
        .action-list li {
            margin: 15px 0;
            padding-left: 30px;
            position: relative;
            font-size: 17px;
        }
        
        .action-list li:before {
            content: "→";
            position: absolute;
            left: 0;
            font-size: 20px;
        }
        
        /* Bottom Line Box */
        .bottom-line {
            background: #dc3545;
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin: 30px 0;
            text-align: center;
        }
        
        .bottom-line h3 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .bottom-line-item {
            margin: 10px 0;
            font-size: 17px;
        }
        
        .good-news {
            background: #28a745;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .good-news h4 {
            margin-bottom: 10px;
        }
        
        /* Comparison Table */
        .comparison-section {
            margin: 30px 0;
        }
        
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        
        .comparison-table th {
            background: #2c5aa0;
            color: white;
            padding: 15px;
            text-align: left;
        }
        
        .comparison-table td {
            padding: 15px;
            border-bottom: 1px solid #ddd;
        }
        
        .comparison-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .highlight-good {
            color: #28a745;
            font-weight: bold;
        }
        
        .highlight-bad {
            color: #dc3545;
            font-weight: bold;
        }
        
        @media (max-width: 768px) {
            .status-grid {
                grid-template-columns: 1fr;
            }
            
            .report-container {
                padding: 20px;
            }
        }`;
}

/**
 * Generate header section
 */
function generateHeaderSection(header) {
  return `
    <div class="header">
        <h1>${header.title}</h1>
        <div class="subtitle">${header.subtitle}</div>
    </div>`;
}

/**
 * Generate critical alert section
 */
function generateCriticalAlert(alert) {
  const alertClass = alert.type === 'income_cap_bad' ? 'critical-alert urgent' : 'critical-alert';
  
  return `
    <div class="${alertClass}">
        <h3>${alert.title}</h3>
        <p>${alert.message}</p>
        ${alert.goodNews ? `<p><strong>${alert.goodNews}</strong></p>` : ''}
        ${alert.urgentAction ? `<p><strong>${alert.urgentAction}</strong></p>` : ''}
        ${alert.advantage ? `<p><strong>${alert.advantage}</strong></p>` : ''}
    </div>`;
}

/**
 * Generate status grid
 */
function generateStatusGrid(statusGrid) {
  const incomeClass = statusGrid.income.status === 'qualified' ? 'status-qualified' : 'status-over';
  const assetClass = statusGrid.assets.status === 'qualified' ? 'status-qualified' : 'status-over';
  const incomeIcon = statusGrid.income.status === 'qualified' ? '✓' : '✗';
  const assetIcon = statusGrid.assets.status === 'qualified' ? '✓' : '✗';
  
  return `
    <div class="status-grid">
        <div class="status-card ${incomeClass}">
            <div class="status-title">${incomeIcon} INCOME STATUS</div>
            <div class="status-amount">$${statusGrid.income.amount.toLocaleString()}</div>
            <div class="status-limit">Limit: $${statusGrid.income.limit.toLocaleString()}/month</div>
            <div class="status-message">${statusGrid.income.message}</div>
        </div>
        
        <div class="status-card ${assetClass}">
            <div class="status-title">${assetIcon} ASSET STATUS</div>
            <div class="status-amount">$${statusGrid.assets.amount.toLocaleString()}</div>
            <div class="status-limit">Limit: $${statusGrid.assets.limit.toLocaleString()}</div>
            <div class="status-message">${statusGrid.assets.message}</div>
        </div>
    </div>`;
}

/**
 * Generate asset breakdown
 */
function generateAssetBreakdown(breakdown) {
  const protectedList = breakdown.protected.map(item => `<li><strong>${item}</strong></li>`).join('');
  
  return `
    <div class="asset-breakdown">
        <h3>Your Asset Breakdown: What's at Risk vs. Already Protected</h3>
        
        <div class="asset-category">
            <div class="asset-at-risk">❌ At Risk: $${breakdown.atRisk.amount.toLocaleString()} (${breakdown.atRisk.description})</div>
        </div>
        
        <div class="asset-category">
            <div class="asset-protected">✅ Already Protected:</div>
            <ul class="asset-list">
                ${protectedList}
            </ul>
        </div>
    </div>`;
}

/**
 * Generate timeline section
 */
function generateTimeline(timeline) {
  return `
    <div class="timeline-box">
        <div class="timeline-title">⏰ Your Planning Timeline</div>
        <div class="timeline-item">At current care costs of <span class="timeline-cost">$${timeline.careCost.toLocaleString()}/month</span>:</div>
        <div class="timeline-item">• <strong>Without planning:</strong> Broke in ${timeline.monthsUntilBroke} months (${timeline.breakDate})</div>
        <div class="timeline-item">• <strong>With planning starting TODAY:</strong> Protect $${timeline.potentialSavings.toLocaleString()}+</div>
        <div class="timeline-item">• <strong>Every month you wait costs:</strong> <span class="timeline-cost">$${timeline.monthlyCost.toLocaleString()}</span> in lost savings</div>
    </div>`;
}

/**
 * Generate state advantages
 */
function generateStateAdvantages(advantages) {
  const advantagesList = advantages.map(adv => 
    `<div class="advantage-item">
        <span class="advantage-icon">${adv.icon}</span>
        <span>${adv.text}</span>
    </div>`
  ).join('');
  
  return `
    <div class="florida-advantages">
        <h3>🌴 Florida Advantages for Medicaid Planning</h3>
        ${advantagesList}
    </div>`;
}

/**
 * Generate lookback section
 */
function generateLookbackSection(lookback) {
  const explanationList = lookback.explanation.map(item => `<li>${item}</li>`).join('');
  
  return `
    <div class="lookback-section">
        <h3 class="lookback-title">The 5-Year Look-Back Period Explained</h3>
        <div class="lookback-details">
            <p>📅 <strong>Medicaid will examine:</strong> ${lookback.period}</p>
            <p>⚠️ <strong>State's penalty divisor:</strong> $${lookback.penaltyDivisor.toLocaleString()} = 1 month penalty</p>
        </div>
        <div class="lookback-warning">
            <strong>What this means for you:</strong>
            <ul>
                ${explanationList}
            </ul>
        </div>
    </div>`;
}

/**
 * Generate income details
 */
function generateIncomeDetails(income) {
  const strategiesList = income.strategies.map(strategy => `<li>${strategy}</li>`).join('');
  const sectionClass = income.qualified ? 'income-details' : 'income-details over-income';
  
  return `
    <div class="${sectionClass}">
        <h3>${income.qualified ? '✅' : '❌'} Your Income Situation: ${income.qualified ? 'QUALIFIED!' : 'NEEDS ATTENTION'}</h3>
        <div class="income-item">• <strong>Current Income:</strong> $${income.currentIncome.toLocaleString()}/month</div>
        <div class="income-item">• <strong>Income Limit:</strong> $${income.incomeLimit.toLocaleString()}/month</div>
        <div class="income-item">• <strong>Your Buffer:</strong> $${Math.abs(income.buffer).toLocaleString()}/month</div>
        <div class="income-item">• <strong>Miller Trust Needed:</strong> ${income.millerTrustNeeded ? 'YES! (Required immediately)' : 'NO! (Saving you $2,000+)'}</div>
        
        <h4 style="margin-top: 20px;">Smart Income Strategies ${income.qualified ? 'Still Available' : 'Required'}:</h4>
        <ul>
            ${strategiesList}
        </ul>
    </div>`;
}

/**
 * Generate comparison table
 */
function generateComparisonTable(comparison) {
  return `
    <div class="comparison-section">
        <h3 style="color: #2c5aa0;">Without Planning vs. With Planning</h3>
        <table class="comparison-table">
            <thead>
                <tr>
                    <th>Your Situation</th>
                    <th>Now</th>
                    <th>Without Planning</th>
                    <th>With Planning</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Your Assets</strong></td>
                    <td>$${comparison.current.assets.toLocaleString()}</td>
                    <td class="highlight-bad">$${comparison.withoutPlanning.assets.toLocaleString()}</td>
                    <td class="highlight-good">$${comparison.withPlanning.assets.toLocaleString()}+</td>
                </tr>
                <tr>
                    <td><strong>Your Home</strong></td>
                    <td>${comparison.current.home}</td>
                    <td class="highlight-bad">${comparison.withoutPlanning.home}</td>
                    <td class="highlight-good">${comparison.withPlanning.home}</td>
                </tr>
                <tr>
                    <td><strong>Monthly Out-of-Pocket</strong></td>
                    <td>$${comparison.current.monthlyOutOfPocket.toLocaleString()}</td>
                    <td>$${comparison.withoutPlanning.monthlyOutOfPocket.toLocaleString()}</td>
                    <td class="highlight-good">$${comparison.withPlanning.monthlyOutOfPocket} (Medicaid pays)</td>
                </tr>
                <tr>
                    <td><strong>Family Legacy</strong></td>
                    <td>${comparison.current.familyLegacy}</td>
                    <td class="highlight-bad">${comparison.withoutPlanning.familyLegacy}</td>
                    <td class="highlight-good">${comparison.withPlanning.familyLegacy}</td>
                </tr>
                <tr>
                    <td><strong>Time to Broke</strong></td>
                    <td>${comparison.current.timeToBroke} months</td>
                    <td class="highlight-bad">${comparison.withoutPlanning.timeToBroke} months</td>
                    <td class="highlight-good">${comparison.withPlanning.timeToBroke}</td>
                </tr>
            </tbody>
        </table>
    </div>`;
}

/**
 * Generate action items
 */
function generateActionItems(actions) {
  const actionsList = actions.map(action => {
    let content = `<li><strong`;
    
    // Add color styling based on action type
    if (action.type === 'success') {
      content += ` style="color: #4caf50;">✅ ${action.title}</strong> - ${action.description}`;
    } else if (action.type === 'urgent') {
      content += ` style="color: #ff9800;">🔴 ${action.title}</strong> - ${action.description}`;
    } else {
      content += `>${action.title}</strong> - ${action.description || ''}`;
    }
    
    if (action.strategies) {
      const strategiesList = action.strategies.map(s => `<li>• ${s}</li>`).join('');
      content += `<ul style="margin-top: 10px; font-size: 16px;">${strategiesList}</ul>`;
    }
    content += '</li>';
    return content;
  }).join('');
  
  return `
    <div class="action-items">
        <h3>Your Immediate Action Items</h3>
        <ul class="action-list">
            ${actionsList}
        </ul>
    </div>`;
}

/**
 * Generate state Q&A
 */
function generateStateQA(qa) {
  const qaItems = qa.map(item => 
    `<div class="qa-item">
        <div class="qa-question">${item.question}</div>
        <div class="qa-answer">${item.answer}</div>
    </div>`
  ).join('');
  
  return `
    <div class="florida-qa">
        <h3>Florida-Specific Questions Answered</h3>
        ${qaItems}
    </div>`;
}

/**
 * Generate bottom line
 */
function generateBottomLine(bottomLine) {
  const keyPointsList = bottomLine.keyPoints.map(point => 
    `<div class="bottom-line-item">• ${point}</div>`
  ).join('');
  
  return `
    <div class="bottom-line">
        <h3>🚨 The Bottom Line for Your Situation</h3>
        ${keyPointsList}
        
        <div class="good-news">
            <h4>${bottomLine.goodNews.title}</h4>
            <p>${bottomLine.goodNews.message}</p>
        </div>
    </div>`;
}

module.exports = {
  generateEnhancedEligibilityHTML,
  generateEmbeddedEligibilityHTML
};