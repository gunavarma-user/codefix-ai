import { CodeExample } from '../types';

export const CODE_EXAMPLES: CodeExample[] = [
  // Python Examples
  {
    id: 'py-1',
    title: 'Missing Colon in If Statement',
    language: 'python',
    category: 'Syntax Error',
    description: 'A classic syntax error when writing conditional statements in Python.',
    code: `def check_passing_grade(score):
    if score >= 60
        print("Student passed the exam!")
    else:
        print("Student needs to retake the exam.")

check_passing_grade(75)`,
    expectedIssue: 'Missing colon at the end of the if statement.'
  },
  {
    id: 'py-2',
    title: 'Undefined Variable (NameError)',
    language: 'python',
    category: 'Runtime Error',
    description: 'Calling or referencing a variable before declaration or misspelling variable name.',
    code: `def calculate_area(radius):
    pi_value = 3.14159
    area = pi_val * (radius ** 2)
    return area

print("Area is:", calculate_area(5))`,
    expectedIssue: 'pi_val is used instead of pi_value causing a NameError.'
  },
  {
    id: 'py-3',
    title: 'Index Out of Range',
    language: 'python',
    category: 'Runtime Error',
    description: 'Accessing a list index that is equal to or greater than list length.',
    code: `fruits = ["apple", "banana", "cherry"]

# Trying to print all items using an incorrect range
for i in range(len(fruits) + 1):
    print("Fruit:", fruits[i])`,
    expectedIssue: 'IndexError when accessing fruits[3] on a 3-item list.'
  },
  {
    id: 'py-4',
    title: 'Type Error (String + Integer)',
    language: 'python',
    category: 'Runtime Error',
    description: 'Concatenating a string and an integer directly without casting.',
    code: `user_name = "Alex"
user_age = 19

# Trying to join text and number directly
message = "Hello, my name is " + user_name + " and I am " + user_age + " years old."
print(message)`,
    expectedIssue: 'Cannot concatenate str and int without converting int to str or using f-strings.'
  },
  {
    id: 'py-5',
    title: 'Incorrect Indentation',
    language: 'python',
    category: 'Syntax Error',
    description: 'Mixing inconsistent spacing or misaligning indented blocks.',
    code: `def greet_students(students):
for student in students:
    print("Welcome, " + student)

greet_students(["Emma", "Liam", "Sophia"])`,
    expectedIssue: 'IndentationError: expected an indented block after function definition.'
  },

  // C Examples
  {
    id: 'c-1',
    title: 'Missing Semicolon',
    language: 'c',
    category: 'Syntax Error',
    description: 'Missing semicolon at statement termination.',
    code: `#include <stdio.h>

int main() {
    int count = 10;
    int multiplier = 5
    int result = count * multiplier;
    
    printf("Total: %d\\n", result);
    return 0;
}`,
    expectedIssue: 'Expected semicolon after int multiplier = 5'
  },
  {
    id: 'c-2',
    title: 'Wrong Format Specifier',
    language: 'c',
    category: 'Logical Error',
    description: 'Passing a float or double to %d or passing value instead of address to scanf.',
    code: `#include <stdio.h>

int main() {
    int age;
    printf("Enter your age: ");
    // Missing & address operator in scanf
    scanf("%d", age);
    
    printf("You are %d years old.\\n", age);
    return 0;
}`,
    expectedIssue: 'scanf expects a pointer (&age), passing uninitialized value age causes segmentation fault.'
  },
  {
    id: 'c-3',
    title: 'Pointer Dereference Mistake',
    language: 'c',
    category: 'Runtime Error',
    description: 'Dereferencing an uninitialized or NULL pointer.',
    code: `#include <stdio.h>

int main() {
    int *ptr = NULL;
    
    // Attempting to assign value to null pointer directly
    *ptr = 42;
    
    printf("Value: %d\\n", *ptr);
    return 0;
}`,
    expectedIssue: 'Segmentation fault from dereferencing a NULL pointer.'
  },

  // C++ Examples
  {
    id: 'cpp-1',
    title: 'Missing Semicolon in Class Definition',
    language: 'cpp',
    category: 'Syntax Error',
    description: 'Forgetting the trailing semicolon after class or struct definition.',
    code: `#include <iostream>
#include <string>

class Student {
public:
    std::string name;
    int grade;
    
    void display() {
        std::cout << name << " - Grade: " << grade << std::endl;
    }
} // Missing semicolon here

int main() {
    Student s;
    s.name = "Alice";
    s.grade = 95;
    s.display();
    return 0;
}`,
    expectedIssue: 'Expected ; after class Student definition.'
  },
  {
    id: 'cpp-2',
    title: 'Incorrect Vector Usage (Out of Bounds)',
    language: 'cpp',
    category: 'Runtime Error',
    description: 'Using [] operator to assign elements to an empty vector without resizing or push_back.',
    code: `#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers; // Empty vector of size 0
    
    // Wrong: using array index assignment on empty vector
    for (int i = 0; i < 5; i++) {
        numbers[i] = i * 10;
    }
    
    for (int n : numbers) {
        std::cout << n << " ";
    }
    return 0;
}`,
    expectedIssue: 'Accessing out of bounds elements on vector without push_back or resize.'
  },
  {
    id: 'cpp-3',
    title: 'Wrong Variable Type Conversion',
    language: 'cpp',
    category: 'Logical Error',
    description: 'Integer division truncation causing unexpected float calculation.',
    code: `#include <iostream>

int main() {
    int score = 45;
    int total = 50;
    
    // Integer division drops decimal places
    double percentage = (score / total) * 100;
    
    std::cout << "Percentage: " << percentage << "%" << std::endl;
    return 0;
}`,
    expectedIssue: '(score / total) evaluates to 0 because both are ints, yielding percentage 0.0%.'
  },

  // Java Examples
  {
    id: 'java-1',
    title: 'Missing Semicolon & Case Sensitivity',
    language: 'java',
    category: 'Syntax Error',
    description: 'Missing semicolon and incorrect casing on standard library methods.',
    code: `public class Main {
    public static void main(String[] args) {
        String greeting = "Hello, Java Developer"
        int year = 2026;
        
        System.out.println(greeting + " in " + year);
    }
}`,
    expectedIssue: 'Missing semicolon after String greeting assignment.'
  },
  {
    id: 'java-2',
    title: 'NullPointerException',
    language: 'java',
    category: 'Runtime Error',
    description: 'Invoking methods on an uninitialized or null object reference.',
    code: `public class Main {
    public static void main(String[] args) {
        String username = null;
        
        // Calling method on null reference
        if (username.equalsIgnoreCase("admin")) {
            System.out.println("Access granted");
        } else {
            System.out.println("Access denied");
        }
    }
}`,
    expectedIssue: 'NullPointerException when calling equalsIgnoreCase on null username.'
  },
  {
    id: 'java-3',
    title: 'Wrong Variable Type Assignment',
    language: 'java',
    category: 'Syntax Error',
    description: 'Assigning a floating point number to an integer variable without casting.',
    code: `public class Main {
    public static void main(String[] args) {
        double price = 19.99;
        // Incompatible types: possible lossy conversion from double to int
        int roundedPrice = price;
        
        System.out.println("Price: $" + roundedPrice);
    }
}`,
    expectedIssue: 'Type mismatch: cannot directly assign double to int without explicit (int) cast.'
  },

  // JavaScript Examples
  {
    id: 'js-1',
    title: 'Undefined Variable Reference',
    language: 'javascript',
    category: 'Runtime Error',
    description: 'Trying to access properties on an undefined variable or typo in variable name.',
    code: `function getUserDashboard(user) {
    console.log("Loading dashboard for " + user.name);
    
    // Typo in profileSettings vs user.profileSettings
    const theme = user.profleSettings.theme;
    return { name: user.name, theme: theme };
}

const currentUser = { name: "Sarah", profileSettings: { theme: "dark" } };
console.log(getUserDashboard(currentUser));`,
    expectedIssue: 'TypeError: Cannot read properties of undefined (reading theme) due to typo in profleSettings.'
  },
  {
    id: 'js-2',
    title: 'TypeError: is not a function',
    language: 'javascript',
    category: 'Runtime Error',
    description: 'Invoking an object property that is not a function or variable shadowing.',
    code: `const calculator = {
    add: 10,
    multiply: function(a, b) {
        return a * b;
    }
};

// Trying to call add as a function
const sum = calculator.add(5, 10);
console.log("Sum is:", sum);`,
    expectedIssue: 'TypeError: calculator.add is not a function (add is a number, not a function).'
  },
  {
    id: 'js-3',
    title: 'Incorrect Array Method / Asynchronous Usage',
    language: 'javascript',
    category: 'Logical Error',
    description: 'Using forEach with async/await expecting it to wait, or mutating while iterating.',
    code: `function calculateDiscounts(items) {
    let totalDiscount = 0;
    
    // Trying to use reduce with incorrect return
    const total = items.reduce((acc, item) => {
        acc + item.price; // Missing return keyword or expression body
    }, 0);
    
    return total;
}

const cart = [{ price: 20 }, { price: 30 }, { price: 50 }];
console.log("Cart Total:", calculateDiscounts(cart));`,
    expectedIssue: 'Array.prototype.reduce callback does not return accumulator, resulting in NaN or undefined.'
  }
];
