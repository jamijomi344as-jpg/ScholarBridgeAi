export interface StudyFieldCategory {
  name: string;
  fields: string[];
}

/** Curated study fields used wherever students choose a target major. */
export const STUDY_FIELD_CATEGORIES: StudyFieldCategory[] = [
  {
    name: "Technology & Computer Science",
    fields: [
      "Computer Science",
      "Data Science",
      "Artificial Intelligence / Machine Learning",
      "Software Engineering",
      "Cybersecurity",
      "Information Technology (IT)",
    ],
  },
  {
    name: "Engineering",
    fields: [
      "Mechanical Engineering",
      "Electrical Engineering",
      "Civil Engineering",
      "Chemical Engineering",
      "Biomedical Engineering",
      "Aerospace Engineering",
      "Robotics",
    ],
  },
  {
    name: "Business & Economics",
    fields: [
      "Business Administration",
      "Economics",
      "Finance",
      "Accounting",
      "Marketing",
      "International Business",
      "Entrepreneurship",
    ],
  },
  {
    name: "Medicine & Health Sciences",
    fields: [
      "Medicine (MBBS/MD)",
      "Dentistry",
      "Pharmacy",
      "Nursing",
      "Public Health",
      "Biomedical Sciences",
    ],
  },
  {
    name: "Natural Sciences",
    fields: ["Biology", "Chemistry", "Physics", "Mathematics", "Environmental Science"],
  },
  {
    name: "Social Sciences & Humanities",
    fields: [
      "Psychology",
      "Political Science",
      "International Relations",
      "Sociology",
      "Law",
      "Journalism / Media Studies",
    ],
  },
  {
    name: "Arts & Design",
    fields: ["Architecture", "Graphic Design", "Fine Arts", "Fashion Design"],
  },
  {
    name: "Education & Others",
    fields: [
      "Education",
      "Linguistics / Translation Studies",
      "Hospitality & Tourism Management",
      "Agriculture Sciences",
    ],
  },
];

export const STUDY_FIELDS = STUDY_FIELD_CATEGORIES.flatMap((category) => category.fields);
