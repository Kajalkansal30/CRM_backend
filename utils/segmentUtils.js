// /**
//  * utils/segmentUtils.js
//  * Utility functions to evaluate segment rules and get matching customers
//  */

// // Utility function to evaluate segment rules for a customer
// const evaluateRule = (rule, customer) => {
//   if (!rule) return false;

//   if (rule.operator === 'AND') {
//     return rule.conditions.every(condition => evaluateRule(condition, customer));
//   } else if (rule.operator === 'OR') {
//     return rule.conditions.some(condition => evaluateRule(condition, customer));
//   } else {
//     // Simple condition
//     let field = rule.field;
//     const operator = rule.operator;
//     let value = rule.value;

//     // Normalize field names to match customer schema
//     const fieldMap = {
//       totalSpend: 'totalSpend',
//       visits: 'visits',
//       lastActive: 'lastActive'
//     };

//     if (fieldMap[field]) {
//       field = fieldMap[field];
//     }

//     if (!(field in customer)) {
//       return false;
//     }

//     // Convert value to appropriate type based on field
//     if (field === 'totalSpend' || field === 'visits') {
//       value = Number(value);
//       if (isNaN(value)) return false;
//     } else if (field === 'lastActive') {
//       value = new Date(value);
//       if (isNaN(value.getTime())) return false;
//     }

//     switch (operator) {
//       case '>':
//         return customer[field] > value;
//       case '<':
//         return customer[field] < value;
//       case '=':
//         return customer[field] == value;
//       case '!=':
//         return customer[field] != value;
//       case '>=':
//         return customer[field] >= value;
//       case '<=':
//         return customer[field] <= value;
//       default:
//         return false;
//     }
//   }
// };

// // Utility function to count customers matching segment rules
// const getMatchingCustomers = async (rules, Customer) => {
//   if (!rules) return [];

//   try {
//     const customers = await Customer.find();
//     return customers.filter(customer => {
//       try {
//         const result = evaluateRule(rules, customer);
//         // if (!result) {
//         //   console.log(`Customer ${customer._id} did not match rules`);
//         // } else {
//         //   console.log(`Customer ${customer._id} matched rules`);
//         // }
//         return result;
//       } catch (e) {
//         console.error('Error evaluating rule for customer:', customer._id, e);
//         return false;
//       }
//     });
//   } catch (err) {
//     console.error('Error fetching customers:', err);
//     throw err;
//   }
// };

// module.exports = { evaluateRule, getMatchingCustomers };


/**
 * utils/segmentUtils.js
 * Utility functions to evaluate segment rules and get matching customers
 */

// Utility function to evaluate segment rules for a customer
const evaluateRule = (rule, customer) => {
  if (!rule) return false;

  if (rule.operator === 'AND') {
    return rule.conditions.every(condition => evaluateRule(condition, customer));
  } else if (rule.operator === 'OR') {
    return rule.conditions.some(condition => evaluateRule(condition, customer));
  } else {
    // Simple condition
    let field = rule.field;
    const operator = rule.operator;
    let value = rule.value;

    // Normalize field names to match customer schema
    const fieldMap = {
      totalSpend: 'totalSpend',
      visits: 'visits',
      lastActive: 'lastActive'
    };

    if (fieldMap[field]) {
      field = fieldMap[field];
    }

    // Check if field exists in customer
    if (!(field in customer)) {
      return false;
    }

    // Get customer field value (could be nested)
    const customerValue = customer[field];

    // Convert value to appropriate type based on field
    if (field === 'totalSpend' || field === 'visits') {
      value = Number(value);
      if (isNaN(value)) return false;
    } else if (field === 'lastActive') {
      value = new Date(value);
      if (isNaN(value.getTime())) return false;

      // Convert customer lastActive to Date if it's a string
      const customerDate = customerValue instanceof Date 
        ? customerValue 
        : new Date(customerValue);
      
      // Compare dates
      switch (operator) {
        case '>':
          return customerDate > value;
        case '<':
          return customerDate < value;
        case '=':
          return customerDate.getTime() === value.getTime();
        case '!=':
          return customerDate.getTime() !== value.getTime();
        case '>=':
          return customerDate >= value;
        case '<=':
          return customerDate <= value;
        default:
          return false;
      }
    }

    // Handle non-date comparisons
    switch (operator) {
      case '>':
        return customerValue > value;
      case '<':
        return customerValue < value;
      case '=':
        return customerValue == value;
      case '!=':
        return customerValue != value;
      case '>=':
        return customerValue >= value;
      case '<=':
        return customerValue <= value;
      default:
        return false;
    }
  }
};

// Utility function to count customers matching segment rules
const getMatchingCustomers = async (rules, customers) => {
  if (!rules) return [];

  try {
    // If customers is a Mongoose model, fetch all customers
    if (typeof customers.find === 'function' && typeof customers !== 'array') {
      customers = await customers.find();
    }

    // Filter customers based on rules
    return customers.filter(customer => {
      try {
        return evaluateRule(rules, customer);
      } catch (e) {
        console.error('Error evaluating rule for customer:', customer._id, e);
        return false;
      }
    });
  } catch (err) {
    console.error('Error processing customers:', err);
    throw err;
  }
};

// Calculate audience size based on segment rules
const calculateAudienceSize = async (segment, customers) => {
  if (!segment || !segment.rules) return 0;
  
  try {
    const matchingCustomers = await getMatchingCustomers(segment.rules, customers);
    return matchingCustomers.length;
  } catch (err) {
    console.error('Error calculating audience size:', err);
    return 0;
  }
};

module.exports = { 
  evaluateRule, 
  getMatchingCustomers,
  calculateAudienceSize
};