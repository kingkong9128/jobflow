// JobFlow Content Script - Form Detection and Auto-Fill

const FIELD_MAPPINGS = {
  // Common name fields
  'name': ['name', 'fullname', 'full-name', 'full_name', 'applicant_name', 'candidate_name', 'your_name', 'first name', 'firstname', 'first_name'],
  'firstName': ['firstname', 'first_name', 'first name', 'given_name', 'given name'],
  'lastName': ['lastname', 'last_name', 'last name', 'family_name', 'family name', 'surname', 'sur_name'],
  
  // Email
  'email': ['email', 'email_address', 'emailaddress', 'e-mail', 'mail', 'your_email', 'contact_email'],
  
  // Phone
  'phone': ['phone', 'telephone', 'phone_number', 'phonenumber', 'mobile', 'cell', 'contact_no', 'contact_number', 'tel'],
  
  // Location
  'location': ['location', 'address', 'city', 'current_location', 'your_location', 'residence'],
  'city': ['city', 'town', 'current_city'],
  'state': ['state', 'province', 'region', 'state_province'],
  'country': ['country', 'nationality', 'citizenship'],
  'zipCode': ['zip', 'zipcode', 'zip_code', 'postal', 'postal_code', 'postcode'],
  'address': ['street', 'address', 'street_address', 'address_line1', 'address1', 'address_line_2'],
  
  // Work experience
  'currentTitle': ['current_title', 'current_position', 'job_title', 'title', 'position', 'role', 'current_role', 'job_title'],
  'currentCompany': ['current_company', 'current_employer', 'company', 'employer', 'organization', 'work_place'],
  'yearsExperience': ['years_experience', 'total_experience', 'experience_years', 'work_experience', 'yr_exp'],
  
  // Education
  'education': ['education', 'degree', 'qualification', 'academic_qualification', 'highest_degree'],
  'university': ['university', 'college', 'institution', 'school', 'higher_education'],
  
  // Skills
  'skills': ['skills', 'technologies', 'technologies_skills', 'competencies', 'expertise', 'key_skills'],
  
  // LinkedIn
  'linkedin': ['linkedin', 'linked_in', 'linkedin_url', 'linkedin_profile', 'linked-in'],
  
  // Website/Portfolio
  'website': ['website', 'portfolio', 'personal_website', 'homepage', 'site', 'url', 'link'],
  
  // Resume/CV
  'resume': ['resume', 'cv', 'curriculum_vitae', 'attach_resume', 'upload_resume', 'resume_upload'],
  
  // Cover letter
  'coverLetter': ['cover_letter', 'coverletter', 'cover letter', 'motivation_letter', 'letter'],
  
  // Gender (avoid for bias)
  'gender': ['gender', 'sex'],
  
  // ethnicity (avoid for bias)
  'ethnicity': ['ethnicity', 'race'],
  
  // salary expectations
  'salary': ['salary', 'salary_expectation', 'expected_salary', 'desired_salary', 'notice_period', 'notice']
};

// Common blocked sites
const BLOCKED_PATTERNS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'monster.com',
  'simplyhired.com'
];

function isBlockedSite() {
  const hostname = window.location.hostname;
  return BLOCKED_PATTERNS.some(pattern => hostname.includes(pattern));
}

function getFieldType(fieldName) {
  const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const [type, aliases] of Object.entries(FIELD_MAPPINGS)) {
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName)) {
        return type;
      }
    }
  }
  
  return null;
}

function findFormFields() {
  const fields = [];
  const seenLabels = new Set();
  
  // Find all input elements
  const inputs = document.querySelectorAll('input, select, textarea');
  
  for (const input of inputs) {
    // Skip hidden fields
    if (input.type === 'hidden' || input.disabled) continue;
    
    // Get associated label
    let label = '';
    let labelEl = null;
    
    // Check for aria-label
    if (input.getAttribute('aria-label')) {
      label = input.getAttribute('aria-label');
    }
    
    // Check for placeholder
    if (!label && input.placeholder) {
      label = input.placeholder;
    }
    
    // Check for label element
    if (!label) {
      const id = input.id || input.name;
      if (id) {
        labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl) {
          label = labelEl.textContent;
        }
      }
    }
    
    // Check parent labels
    if (!label) {
      const parentLabel = input.closest('label');
      if (parentLabel) {
        label = parentLabel.textContent;
        labelEl = parentLabel;
      }
    }
    
    // Check grandparent labels (for wrapped inputs)
    if (!label) {
      const grandParent = input.parentElement?.parentElement;
      if (grandParent) {
        const firstLabel = grandParent.querySelector('label');
        if (firstLabel) {
          label = firstLabel.textContent;
          labelEl = firstLabel;
        }
      }
    }
    
    // Deduplicate by label
    const normalizedLabel = label.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seenLabels.has(normalizedLabel) && normalizedLabel.length > 3) continue;
    if (label) seenLabels.add(normalizedLabel);
    
    // Determine field type
    const fieldType = getFieldType(label || input.name || input.id || '');
    
    fields.push({
      element: input,
      label: label.trim(),
      type: input.tagName.toLowerCase(),
      inputType: input.type,
      name: input.name,
      id: input.id,
      fieldType,
      required: input.required || input.hasAttribute('aria-required')
    });
  }
  
  return fields;
}

function fillField(field, value) {
  if (!value) return false;
  
  try {
    // For select elements
    if (field.tagName.toLowerCase() === 'select') {
      const options = Array.from(field.options);
      const matchOption = options.find(opt => 
        opt.textContent.toLowerCase().includes(value.toLowerCase()) ||
        opt.value.toLowerCase().includes(value.toLowerCase())
      );
      if (matchOption) {
        field.value = matchOption.value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    
    // For input/textarea
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Handle contenteditable
    if (field.getAttribute('contenteditable') === 'true') {
      field.textContent = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    return true;
  } catch (error) {
    console.error('Failed to fill field:', error);
    return false;
  }
}

function fillFormWithData(data) {
  if (isBlockedSite()) {
    return { success: false, error: 'This site does not allow auto-fill' };
  }
  
  const fields = findFormFields();
  let filled = 0;
  let skipped = 0;
  
  const fieldHandlers = {
    name: () => data.name,
    firstName: () => data.name?.split(' ')[0],
    lastName: () => data.name?.split(' ').slice(1).join(' '),
    email: () => data.email,
    phone: () => data.phone,
    location: () => data.location,
    city: () => data.location?.split(',')[0],
    linkedin: () => data.linkedin || data.linkedinUrl,
    skills: () => Array.isArray(data.skills) ? data.skills.join(', ') : data.skills,
    website: () => data.website || data.portfolio
  };
  
  for (const field of fields) {
    if (!field.fieldType) {
      skipped++;
      continue;
    }
    
    const handler = fieldHandlers[field.fieldType];
    if (!handler) {
      skipped++;
      continue;
    }
    
    const value = handler();
    if (value && fillField(field.element, value)) {
      filled++;
    }
  }
  
  return { success: true, filled, skipped, total: fields.length };
}

// Listen for fill commands from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fillForm') {
    const result = fillFormWithData(message.data);
    sendResponse(result);
  }
  
  if (message.action === 'detectFields') {
    const fields = findFormFields();
    sendResponse({ success: true, fields });
  }
  
  if (message.action === 'checkSite') {
    sendResponse({ 
      blocked: isBlockedSite(),
      fieldsDetected: findFormFields().length
    });
  }
  
  return true;
});

// Signal that content script is loaded
console.log('JobFlow extension loaded');