/**
 * Career ReAct Agent Tools
 * 
 * These are the tools available to the career ReAct agent.
 * Following LangGraph pattern: Each tool is a function that takes args and returns a result.
 */

// Tool result type
export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}

// Tool definitions for Gemini function calling
export const CAREER_TOOLS = [
  {
    name: 'analyze_resume_ats',
    description: 'Analyzes a resume for ATS (Applicant Tracking System) compatibility. Scores the resume on keyword optimization, formatting, and structural integrity.',
    parameters: {
      type: 'object',
      properties: {
        resume_text: {
          type: 'string',
          description: 'The full text content of the resume to analyze'
        },
        target_role: {
          type: 'string',
          description: 'The target job role/title the candidate is applying for'
        },
        industry: {
          type: 'string',
          description: 'The industry sector (e.g., tech, finance, healthcare)'
        }
      },
      required: ['resume_text']
    }
  },
  {
    name: 'search_job_opportunities',
    description: 'Searches for relevant job opportunities based on skills, experience, and preferences. Returns matching job listings with company info.',
    parameters: {
      type: 'object',
      properties: {
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of skills to match'
        },
        experience_level: {
          type: 'string',
          enum: ['entry', 'mid', 'senior', 'executive'],
          description: 'Experience level'
        },
        location: {
          type: 'string',
          description: 'Preferred location (city, remote, hybrid)'
        },
        salary_range: {
          type: 'string',
          description: 'Expected salary range (e.g., "100k-150k")'
        }
      },
      required: ['skills', 'experience_level']
    }
  },
  {
    name: 'generate_career_roadmap',
    description: 'Creates a personalized career development roadmap with milestones, skill gaps to address, and timeline recommendations.',
    parameters: {
      type: 'object',
      properties: {
        current_role: {
          type: 'string',
          description: 'Current job title/role'
        },
        target_role: {
          type: 'string',
          description: 'Desired future job title/role'
        },
        years_experience: {
          type: 'number',
          description: 'Years of professional experience'
        },
        current_skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of current skills'
        }
      },
      required: ['current_role', 'target_role']
    }
  },
  {
    name: 'optimize_bullet_points',
    description: 'Rewrites resume bullet points to be more impactful using the STAR method and action verbs. Quantifies achievements.',
    parameters: {
      type: 'object',
      properties: {
        bullet_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of bullet points to optimize'
        },
        role_context: {
          type: 'string',
          description: 'The role/position these bullet points are for'
        }
      },
      required: ['bullet_points']
    }
  },
  {
    name: 'analyze_linkedin_profile',
    description: 'Analyzes a LinkedIn profile for completeness, keyword optimization, and provides improvement suggestions.',
    parameters: {
      type: 'object',
      properties: {
        profile_url: {
          type: 'string',
          description: 'LinkedIn profile URL'
        },
        headline: {
          type: 'string',
          description: 'Current LinkedIn headline'
        },
        summary: {
          type: 'string',
          description: 'Current LinkedIn summary/about section'
        }
      },
      required: ['headline']
    }
  },
  {
    name: 'prepare_interview_questions',
    description: 'Generates likely interview questions for a specific role and provides answer frameworks.',
    parameters: {
      type: 'object',
      properties: {
        target_role: {
          type: 'string',
          description: 'The role being interviewed for'
        },
        company_name: {
          type: 'string',
          description: 'Company name (for company-specific questions)'
        },
        interview_type: {
          type: 'string',
          enum: ['behavioral', 'technical', 'case', 'mixed'],
          description: 'Type of interview'
        }
      },
      required: ['target_role']
    }
  },
  {
    name: 'calculate_market_salary',
    description: 'Calculates expected market salary range for a role based on experience, location, and skills.',
    parameters: {
      type: 'object',
      properties: {
        role_title: {
          type: 'string',
          description: 'Job title'
        },
        location: {
          type: 'string',
          description: 'City/region'
        },
        years_experience: {
          type: 'number',
          description: 'Years of experience'
        },
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Relevant skills'
        }
      },
      required: ['role_title', 'location']
    }
  },
  {
    name: 'display_ats_analysis',
    description: 'Displays the ATS analysis results in a visual scoreboard format to the user.',
    parameters: {
      type: 'object',
      properties: {
        ats_score: {
          type: 'number',
          description: 'The calculated ATS compatibility score (0-100)'
        },
        strengths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Top structural strengths'
        },
        weaknesses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Primary areas for improvement'
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Actionable improvement steps'
        },
        missing_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords detected as missing'
        },
        keyword_density: {
          type: 'object',
          description: 'Keyword density analysis'
        }
      },
      required: ['ats_score', 'strengths', 'weaknesses', 'recommendations']
    }
  }
];

// Tool implementations
export async function executeToolCall(
  toolName: string, 
  args: Record<string, unknown>
): Promise<ToolResult> {
  console.log(`[ReAct] Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'analyze_resume_ats':
      return analyzeResumeATS(args);
    case 'search_job_opportunities':
      return searchJobOpportunities(args);
    case 'generate_career_roadmap':
      return generateCareerRoadmap(args);
    case 'optimize_bullet_points':
      return optimizeBulletPoints(args);
    case 'analyze_linkedin_profile':
      return analyzeLinkedInProfile(args);
    case 'prepare_interview_questions':
      return prepareInterviewQuestions(args);
    case 'calculate_market_salary':
      return calculateMarketSalary(args);
    case 'display_ats_analysis':
      return displayATSAnalysis(args);
    default:
      return { success: false, data: null, error: `Unknown tool: ${toolName}` };
  }
}

// ATS Resume Analysis
async function analyzeResumeATS(args: Record<string, unknown>): Promise<ToolResult> {
  const resumeText = args.resume_text as string;
  const targetRole = args.target_role as string || 'General';
  const industry = args.industry as string || 'Technology';
  
  // Analyze keyword density
  const keywordCategories = {
    actionVerbs: ['led', 'managed', 'developed', 'implemented', 'achieved', 'increased', 'reduced', 'created', 'designed', 'launched', 'optimized', 'delivered'],
    technicalSkills: ['python', 'javascript', 'react', 'aws', 'kubernetes', 'docker', 'sql', 'machine learning', 'ai', 'data', 'cloud'],
    softSkills: ['leadership', 'communication', 'team', 'collaboration', 'problem-solving', 'strategic', 'analytical'],
    metrics: /\d+%|\$[\d,]+|\d+ (years|months|team members|projects)/gi
  };
  
  const textLower = resumeText.toLowerCase();
  const foundActionVerbs = keywordCategories.actionVerbs.filter(v => textLower.includes(v));
  const foundTechnical = keywordCategories.technicalSkills.filter(s => textLower.includes(s));
  const foundSoft = keywordCategories.softSkills.filter(s => textLower.includes(s));
  const metricsMatches = resumeText.match(keywordCategories.metrics) || [];
  
  // Calculate scores
  const actionVerbScore = Math.min(100, (foundActionVerbs.length / 5) * 100);
  const technicalScore = Math.min(100, (foundTechnical.length / 4) * 100);
  const softSkillScore = Math.min(100, (foundSoft.length / 3) * 100);
  const metricsScore = Math.min(100, (metricsMatches.length / 5) * 100);
  
  const overallScore = Math.round(
    (actionVerbScore * 0.25) + 
    (technicalScore * 0.30) + 
    (softSkillScore * 0.20) + 
    (metricsScore * 0.25)
  );
  
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  const missingKeywords: string[] = [];
  
  // Determine strengths and weaknesses
  if (actionVerbScore >= 60) {
    strengths.push(`Strong use of action verbs (${foundActionVerbs.length} found)`);
  } else {
    weaknesses.push('Limited use of action verbs');
    recommendations.push('Start bullet points with strong action verbs like "Led", "Achieved", "Developed"');
    missingKeywords.push(...keywordCategories.actionVerbs.filter(v => !foundActionVerbs.includes(v)).slice(0, 3));
  }
  
  if (technicalScore >= 60) {
    strengths.push(`Good technical skill representation (${foundTechnical.length} skills)`);
  } else {
    weaknesses.push('Technical skills section needs strengthening');
    recommendations.push('Add relevant technical skills and certifications');
    missingKeywords.push(...keywordCategories.technicalSkills.filter(s => !foundTechnical.includes(s)).slice(0, 3));
  }
  
  if (metricsScore >= 60) {
    strengths.push(`Excellent quantification (${metricsMatches.length} metrics found)`);
  } else {
    weaknesses.push('Achievements lack quantification');
    recommendations.push('Add specific numbers: percentages, dollar amounts, team sizes');
  }
  
  if (resumeText.length < 500) {
    weaknesses.push('Resume content may be too brief');
    recommendations.push('Expand on your experiences with more detail and context');
  }
  
  if (resumeText.length > 3000) {
    weaknesses.push('Resume may be too lengthy for ATS scanning');
    recommendations.push('Consider condensing to 1-2 pages with most relevant information');
  }
  
  return {
    success: true,
    data: {
      atsScore: overallScore,
      breakdown: {
        actionVerbs: actionVerbScore,
        technicalSkills: technicalScore,
        softSkills: softSkillScore,
        quantification: metricsScore
      },
      strengths,
      weaknesses,
      recommendations,
      missingKeywords,
      keywordDensity: {
        actionVerbs: foundActionVerbs,
        technicalSkills: foundTechnical,
        softSkills: foundSoft,
        metricsFound: metricsMatches.length
      },
      targetRole,
      industry
    }
  };
}

// Job Search
async function searchJobOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
  // Handle flexible parameter names
  const skills = (args.skills as string[]) || 
    (args.job_title ? [args.job_title as string] : ['Software Engineer']);
  const experienceLevel = (args.experience_level as string) || 
    (args.years_of_experience ? (parseInt(String(args.years_of_experience)) >= 5 ? 'senior' : 'mid') : 'mid');
  const location = (args.location as string) || 'Remote';
  const salaryRange = (args.salary_range as string) || 'Market Rate';
  
  // Simulated job listings based on skills
  const jobDatabase = [
    {
      title: 'Senior Software Engineer',
      company: 'TechCorp Global',
      location: 'San Francisco, CA / Remote',
      salary: '$150,000 - $200,000',
      match_score: 92,
      skills_match: ['JavaScript', 'React', 'Node.js'],
      posted: '2 days ago'
    },
    {
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'New York, NY / Hybrid',
      salary: '$120,000 - $160,000',
      match_score: 87,
      skills_match: ['Python', 'React', 'AWS'],
      posted: '1 week ago'
    },
    {
      title: 'Engineering Manager',
      company: 'Enterprise Solutions Inc.',
      location: 'Austin, TX',
      salary: '$180,000 - $220,000',
      match_score: 78,
      skills_match: ['Leadership', 'Architecture', 'Agile'],
      posted: '3 days ago'
    },
    {
      title: 'AI/ML Engineer',
      company: 'DataDriven AI',
      location: 'Remote',
      salary: '$140,000 - $190,000',
      match_score: 85,
      skills_match: ['Python', 'Machine Learning', 'TensorFlow'],
      posted: '5 days ago'
    }
  ];
  
  // Filter and sort by match score
  const matchedJobs = jobDatabase
    .filter(job => 
      job.skills_match.some(s => 
        skills.some(userSkill => 
          s.toLowerCase().includes(userSkill.toLowerCase())
        )
      )
    )
    .sort((a, b) => b.match_score - a.match_score);
  
  return {
    success: true,
    data: {
      totalFound: matchedJobs.length,
      jobs: matchedJobs,
      searchCriteria: {
        skills,
        experienceLevel,
        location,
        salaryRange
      },
      marketInsights: {
        averageSalary: '$145,000',
        demandLevel: 'High',
        topSkillsInDemand: ['React', 'Python', 'AWS', 'Kubernetes']
      }
    }
  };
}

// Career Roadmap
async function generateCareerRoadmap(args: Record<string, unknown>): Promise<ToolResult> {
  const currentRole = args.current_role as string;
  const targetRole = args.target_role as string;
  const yearsExp = args.years_experience as number || 3;
  const currentSkills = args.current_skills as string[] || [];
  
  const roadmap = {
    currentState: {
      role: currentRole,
      experience: `${yearsExp} years`,
      skills: currentSkills
    },
    targetState: {
      role: targetRole,
      estimatedTimeframe: '18-24 months',
      expectedSalaryIncrease: '40-60%'
    },
    milestones: [
      {
        phase: 'Foundation',
        duration: '0-6 months',
        objectives: [
          'Master core competencies for target role',
          'Build portfolio projects',
          'Start networking in target industry'
        ],
        skillsToAcquire: ['System Design', 'Leadership Fundamentals'],
        metrics: 'Complete 2 relevant certifications'
      },
      {
        phase: 'Growth',
        duration: '6-12 months',
        objectives: [
          'Take on stretch assignments at current job',
          'Mentor junior team members',
          'Build thought leadership (blog, talks)'
        ],
        skillsToAcquire: ['Strategic Thinking', 'Stakeholder Management'],
        metrics: 'Lead 1 major project end-to-end'
      },
      {
        phase: 'Transition',
        duration: '12-18 months',
        objectives: [
          'Apply for target role positions',
          'Leverage network for referrals',
          'Negotiate offer strategically'
        ],
        skillsToAcquire: ['Executive Presence', 'Negotiation'],
        metrics: 'Secure target role with desired compensation'
      }
    ],
    skillGaps: [
      { skill: 'System Architecture', priority: 'High', resources: ['System Design Primer', 'AWS Solutions Architect cert'] },
      { skill: 'Team Leadership', priority: 'Medium', resources: ['Leadership courses', 'Volunteer lead opportunities'] },
      { skill: 'Business Acumen', priority: 'Medium', resources: ['MBA fundamentals course', 'Industry analysis practice'] }
    ]
  };
  
  return {
    success: true,
    data: roadmap
  };
}

// Bullet Point Optimization
async function optimizeBulletPoints(args: Record<string, unknown>): Promise<ToolResult> {
  const bulletPoints = args.bullet_points as string[];
  const roleContext = args.role_context as string || 'Professional';
  
  const optimized = bulletPoints.map((point, index) => {
    // Simulate optimization with STAR method
    const hasMetrics = /\d+%|\$[\d,]+|\d+/.test(point);
    const hasActionVerb = /^(Led|Managed|Developed|Implemented|Achieved|Created|Designed|Launched|Optimized|Delivered)/i.test(point);
    
    let improved = point;
    let suggestions: string[] = [];
    
    if (!hasActionVerb) {
      improved = `Achieved ${point.toLowerCase()}`;
      suggestions.push('Added strong action verb');
    }
    
    if (!hasMetrics) {
      suggestions.push('Consider adding quantifiable metrics (e.g., increased by X%, reduced costs by $Y)');
    }
    
    return {
      original: point,
      optimized: improved,
      suggestions,
      impactScore: hasMetrics && hasActionVerb ? 'High' : hasMetrics || hasActionVerb ? 'Medium' : 'Low'
    };
  });
  
  return {
    success: true,
    data: {
      roleContext,
      bulletPoints: optimized,
      generalTips: [
        'Start each bullet with a strong action verb',
        'Include at least one quantifiable metric per bullet',
        'Focus on impact and results, not just responsibilities',
        'Keep bullets concise (1-2 lines max)'
      ]
    }
  };
}

// LinkedIn Profile Analysis
async function analyzeLinkedInProfile(args: Record<string, unknown>): Promise<ToolResult> {
  const headline = args.headline as string;
  const summary = args.summary as string || '';
  
  const analysis = {
    headlineScore: headline.length > 20 && headline.length < 120 ? 85 : 60,
    summaryScore: summary.length > 200 ? 80 : summary.length > 50 ? 60 : 30,
    recommendations: [] as string[],
    keywordOptimization: [] as string[]
  };
  
  if (headline.length < 50) {
    analysis.recommendations.push('Expand headline to include key skills and value proposition');
  }
  
  if (!headline.includes('|') && !headline.includes('•')) {
    analysis.recommendations.push('Use separators (| or •) to include multiple roles/skills in headline');
  }
  
  if (summary.length < 200) {
    analysis.recommendations.push('Write a compelling summary (300-500 words) that tells your career story');
  }
  
  analysis.keywordOptimization = [
    'Add industry-specific keywords',
    'Include certifications and tools',
    'Mention specific achievements with numbers'
  ];
  
  return {
    success: true,
    data: {
      overallScore: Math.round((analysis.headlineScore + analysis.summaryScore) / 2),
      ...analysis,
      profileStrength: analysis.headlineScore > 70 && analysis.summaryScore > 70 ? 'All-Star' : 'Intermediate'
    }
  };
}

// Interview Preparation
async function prepareInterviewQuestions(args: Record<string, unknown>): Promise<ToolResult> {
  const targetRole = args.target_role as string;
  const companyName = args.company_name as string || 'General';
  const interviewType = args.interview_type as string || 'mixed';
  
  const questions = {
    behavioral: [
      {
        question: 'Tell me about a time you had to lead a team through a difficult project.',
        framework: 'STAR Method: Situation → Task → Action → Result',
        tips: ['Be specific about your role', 'Quantify the outcome', 'Show leadership skills']
      },
      {
        question: 'Describe a situation where you had to deal with a difficult stakeholder.',
        framework: 'Focus on conflict resolution and communication',
        tips: ['Stay positive', 'Emphasize collaboration', 'Show emotional intelligence']
      },
      {
        question: 'Give an example of when you failed and what you learned.',
        framework: 'Failure → Learning → Application',
        tips: ['Be authentic', 'Show growth mindset', 'Explain how you applied the lesson']
      }
    ],
    technical: [
      {
        question: 'How would you design a scalable system for [relevant use case]?',
        framework: 'Requirements → High-level design → Deep dive → Trade-offs',
        tips: ['Ask clarifying questions', 'Think out loud', 'Consider edge cases']
      },
      {
        question: 'Walk me through your approach to debugging a production issue.',
        framework: 'Identify → Isolate → Fix → Prevent',
        tips: ['Show systematic thinking', 'Mention monitoring tools', 'Discuss prevention strategies']
      }
    ],
    roleSpecific: [
      {
        question: `What interests you most about the ${targetRole} role?`,
        framework: 'Research + Personal Motivation',
        tips: ['Show you researched the role', 'Connect to your career goals', 'Be genuine']
      },
      {
        question: 'Where do you see yourself in 5 years?',
        framework: 'Growth within role → Expansion → Impact',
        tips: ['Align with company trajectory', 'Show ambition', 'Be realistic']
      }
    ]
  };
  
  return {
    success: true,
    data: {
      targetRole,
      company: companyName,
      interviewType,
      questions,
      prepTips: [
        'Research the company thoroughly',
        'Prepare 3-5 STAR stories that can adapt to different questions',
        'Practice out loud with a timer',
        'Prepare thoughtful questions to ask the interviewer'
      ]
    }
  };
}

// Market Salary Calculation
async function calculateMarketSalary(args: Record<string, unknown>): Promise<ToolResult> {
  const roleTitle = args.role_title as string;
  const location = args.location as string;
  const yearsExp = args.years_experience as number || 3;
  const skills = args.skills as string[] || [];
  
  // Base salary lookup (simplified)
  const baseSalaries: Record<string, number> = {
    'software engineer': 120000,
    'senior software engineer': 160000,
    'engineering manager': 190000,
    'product manager': 145000,
    'data scientist': 140000,
    'ai engineer': 165000,
    'devops engineer': 140000,
    'frontend developer': 115000,
    'backend developer': 125000,
    'full stack developer': 130000
  };
  
  const locationMultipliers: Record<string, number> = {
    'san francisco': 1.3,
    'new york': 1.25,
    'seattle': 1.2,
    'austin': 1.1,
    'denver': 1.05,
    'remote': 1.1,
    'default': 1.0
  };
  
  const normalizedRole = roleTitle.toLowerCase();
  const baseSalary = baseSalaries[normalizedRole] || 100000;
  const locationKey = Object.keys(locationMultipliers).find(l => location.toLowerCase().includes(l)) || 'default';
  const locationMult = locationMultipliers[locationKey];
  
  // Experience adjustment
  const expMultiplier = 1 + (Math.min(yearsExp, 15) * 0.03);
  
  // Skills premium
  const highDemandSkills = ['kubernetes', 'machine learning', 'aws', 'react', 'python'];
  const skillPremium = skills.filter(s => highDemandSkills.includes(s.toLowerCase())).length * 5000;
  
  const calculatedSalary = Math.round((baseSalary * locationMult * expMultiplier + skillPremium) / 1000) * 1000;
  const lowRange = Math.round(calculatedSalary * 0.85 / 1000) * 1000;
  const highRange = Math.round(calculatedSalary * 1.15 / 1000) * 1000;
  
  return {
    success: true,
    data: {
      roleTitle,
      location,
      yearsExperience: yearsExp,
      skills,
      salaryRange: {
        low: lowRange,
        mid: calculatedSalary,
        high: highRange,
        formatted: `$${lowRange.toLocaleString()} - $${highRange.toLocaleString()}`
      },
      factors: {
        baseSalary,
        locationMultiplier: locationMult,
        experienceMultiplier: expMultiplier,
        skillPremium
      },
      marketInsights: {
        demandLevel: calculatedSalary > 150000 ? 'High' : 'Moderate',
        competitionLevel: 'Moderate to High',
        negotiationRoom: '10-15%'
      }
    }
  };
}

// Display ATS Analysis (UI trigger)
async function displayATSAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
  // This tool is primarily for triggering the UI display
  return {
    success: true,
    data: {
      displayed: true,
      atsScore: args.ats_score,
      strengths: args.strengths,
      weaknesses: args.weaknesses,
      recommendations: args.recommendations,
      missingKeywords: args.missing_keywords || [],
      keywordDensity: args.keyword_density || {}
    }
  };
}
