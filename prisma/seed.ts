import { PrismaClient, AttemptStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface McqData {
  qNo: number;
  category: string;
  difficulty: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

const mcqSet1: McqData[] = [
  { qNo: 1, category: "Formula", difficulty: "Medium", question: "In a sales MIS sheet, Region is in column C and Sales is in column G (rows 2:200). Which formula correctly totals Sales for the West region?", optionA: "=SUM(G2:G200,\"West\")", optionB: "=SUMIF(C2:C200,\"West\",G2:G200)", optionC: "=COUNTIF(C2:C200,\"West\",G2:G200)", optionD: "=SUMIFS(C2:C200,G2:G200,\"West\")", correctAnswer: "B", explanation: "SUMIF checks C2:C200 for \"West\" and sums the corresponding values in G2:G200." },
  { qNo: 2, category: "Formula", difficulty: "Medium", question: "Employee IDs are in A2:A100 and employee names are in B2:B100. Cell E2 contains an Employee ID. Which formula returns the matching employee name and displays \"Not Found\" if the ID does not exist?", optionA: "=XLOOKUP(E2,A2:A100,B2:B100,\"Not Found\")", optionB: "=XLOOKUP(A2:A100,E2,B2:B100,\"Not Found\")", optionC: "=VLOOKUP(E2,B2:A100,2,FALSE)", optionD: "=MATCH(E2,A2:A100,0)", correctAnswer: "A", explanation: "XLOOKUP uses the lookup value E2, lookup array A2:A100, return array B2:B100, and an if-not-found result." },
  { qNo: 3, category: "Formula", difficulty: "Easy", question: "Cell G2 contains Revenue and cell M1 contains a fixed commission rate. Which formula in H2 can be copied down while always using the rate in M1?", optionA: "=G2*M1", optionB: "=$G$2*M1", optionC: "=G2*$M$1", optionD: "=$G2*M$1", correctAnswer: "C", explanation: "$M$1 is an absolute reference, so the rate remains fixed while G2 changes by row." },
  { qNo: 4, category: "Formula", difficulty: "Medium", question: "B2 contains Actual Sales and C2 contains Target Sales. Which formula returns \"Achieved\" only when Actual Sales is at least the Target and Actual Sales is greater than 0?", optionA: "=IF(OR(B2>=C2,B2>0),\"Achieved\",\"Not Achieved\")", optionB: "=IF(AND(B2>=C2,B2>0),\"Achieved\",\"Not Achieved\")", optionC: "=AND(IF(B2>=C2),\"Achieved\",\"Not Achieved\")", optionD: "=IF(B2>=C2 AND B2>0,\"Achieved\",\"Not Achieved\")", correctAnswer: "B", explanation: "AND requires both conditions to be TRUE; IF then returns the appropriate text." },
  { qNo: 5, category: "Formula", difficulty: "Medium", question: "Region is in B2:B500 and Status is in F2:F500. Which formula counts records where Region is North and Status is Closed?", optionA: "=COUNTIF(B2:B500,\"North\",F2:F500,\"Closed\")", optionB: "=COUNTIFS(B2:B500,\"North\",F2:F500,\"Closed\")", optionC: "=COUNTA(B2:B500,\"North\",F2:F500,\"Closed\")", optionD: "=SUMIFS(B2:B500,\"North\",F2:F500,\"Closed\")", correctAnswer: "B", explanation: "COUNTIFS counts rows that satisfy multiple criteria across matching ranges." },
  { qNo: 6, category: "Formula", difficulty: "Medium", question: "Which formula safely returns a VLOOKUP result from A2:D100 and shows 0 instead of an error when the lookup value in F2 is not found?", optionA: "=IF(VLOOKUP(F2,A2:D100,4,FALSE),0)", optionB: "=IFERROR(VLOOKUP(F2,A2:D100,4,FALSE),0)", optionC: "=VLOOKUP(IFERROR(F2,0),A2:D100,4,FALSE)", optionD: "=IFNAERROR(VLOOKUP(F2,A2:D100,4,FALSE),0)", correctAnswer: "B", explanation: "IFERROR returns the lookup result when valid and 0 when VLOOKUP returns an error." },
  { qNo: 7, category: "Formula", difficulty: "Easy", question: "Cell A2 contains \"  North   Region  \" with extra spaces. Which formula removes leading/trailing spaces and reduces repeated internal spaces to single spaces?", optionA: "=CLEAN(A2)", optionB: "=TRIM(A2)", optionC: "=SUBSTITUTE(A2,\" \",\"\")", optionD: "=LEN(A2)", correctAnswer: "B", explanation: "TRIM removes leading/trailing spaces and reduces multiple internal spaces to a single space." },
  { qNo: 8, category: "Formula", difficulty: "Challenging", question: "Order IDs are in A2:A50 and Revenue is in D2:D50. Cell G2 contains an Order ID. Which formula returns the corresponding Revenue using INDEX and MATCH?", optionA: "=INDEX(A2:A50,MATCH(G2,D2:D50,0))", optionB: "=MATCH(INDEX(G2,A2:A50,0),D2:D50)", optionC: "=INDEX(D2:D50,MATCH(G2,A2:A50,0))", optionD: "=INDEX(D2:D50,MATCH(A2:A50,G2,1))", correctAnswer: "C", explanation: "MATCH finds the row position of G2 in A2:A50; INDEX returns the value from the same position in D2:D50." },
  { qNo: 9, category: "Formula", difficulty: "Medium", question: "Which formula returns the number of working days from 1-Sep-2026 to 30-Sep-2026, excluding weekends and the holiday dates listed in H2:H4?", optionA: "=DATEDIF(DATE(2026,9,1),DATE(2026,9,30),\"d\")", optionB: "=NETWORKDAYS(DATE(2026,9,1),DATE(2026,9,30),H2:H4)", optionC: "=WORKDAY(DATE(2026,9,1),DATE(2026,9,30),H2:H4)", optionD: "=DAY(DATE(2026,9,30))-DAY(DATE(2026,9,1))", correctAnswer: "B", explanation: "NETWORKDAYS counts weekdays between two dates and can exclude a holiday range." },
  { qNo: 10, category: "Formula", difficulty: "Challenging", question: "A2:A100 contains region names with duplicates. Which formula returns a sorted list of distinct regions in modern Excel?", optionA: "=SORT(UNIQUE(A2:A100))", optionB: "=UNIQUE(SORTBY(A2:A100))", optionC: "=SORT(A2:A100,UNIQUE(A2:A100))", optionD: "=FILTER(SORT(A2:A100),UNIQUE(A2:A100))", correctAnswer: "A", explanation: "UNIQUE returns distinct values and SORT orders the resulting dynamic array." },
  { qNo: 11, category: "Scenario", difficulty: "Medium", question: "You are preparing a daily sales MIS and notice that the same Order ID appears twice with identical customer, date, and amount. What is the best first action before reporting totals?", optionA: "Delete one row immediately without checking", optionB: "Confirm whether it is a true duplicate using the source/transaction system, then remove or flag it according to the reporting rule", optionC: "Average the two amounts", optionD: "Keep both rows because Excel imported them", correctAnswer: "B", explanation: "A duplicate should be validated against the source before totals are changed; this protects data accuracy and auditability." },
  { qNo: 12, category: "Scenario", difficulty: "Medium", question: "Management asks for a report in 15 minutes, but your summary total does not match the source system. What should you do?", optionA: "Send the report with the mismatch and correct it later", optionB: "Change the source total to match Excel", optionC: "Perform a focused reconciliation of key totals/filters and communicate any unresolved variance before submission", optionD: "Remove the rows causing the difference", correctAnswer: "C", explanation: "A time-sensitive MIS should still be reconciled; unresolved differences should be transparently flagged rather than hidden." },
  { qNo: 13, category: "Scenario", difficulty: "Easy", question: "You need to email an employee-level salary MIS to management. What is the most appropriate handling practice?", optionA: "Send it to the full department mailing list", optionB: "Upload it to a public link for convenience", optionC: "Share only with authorized recipients and protect the file or access as required by company policy", optionD: "Convert salaries to text so they are less visible", correctAnswer: "C", explanation: "Salary information is confidential and should be restricted to authorized recipients with appropriate access controls." },
  { qNo: 14, category: "Scenario", difficulty: "Challenging", question: "Four branches send monthly files with the same data fields but different column order and naming conventions. What is the most reliable approach for recurring consolidation?", optionA: "Copy and paste columns manually every month", optionB: "Standardize the input template/field mapping and use a repeatable consolidation process with validation checks", optionC: "Ignore unmatched columns", optionD: "Sort each file by employee name and append it", correctAnswer: "B", explanation: "Standardized schemas and repeatable transformations reduce manual errors and make recurring MIS consolidation auditable." },
  { qNo: 15, category: "Scenario", difficulty: "Medium", question: "A regional sales total is lower in the MIS than in the source report. Which check is most useful first?", optionA: "Change the MIS total to the source total", optionB: "Check date filters, region filters, missing records, duplicates, and aggregation ranges", optionC: "Increase all sales values proportionally", optionD: "Reformat the sales column as Currency", correctAnswer: "B", explanation: "Most reconciliation differences arise from filters, missing/duplicate records, or incorrect ranges/aggregation logic." },
  { qNo: 16, category: "Calculation", difficulty: "Easy", question: "A monthly sales target is ₹600,000 and actual sales are ₹540,000. What is the achievement percentage?", optionA: "80%", optionB: "85%", optionC: "90%", optionD: "111.11%", correctAnswer: "C", explanation: "Achievement % = Actual ÷ Target × 100 = 540,000 ÷ 600,000 × 100 = 90%." },
  { qNo: 17, category: "Calculation", difficulty: "Medium", question: "Revenue is ₹250,000 and cost is ₹190,000. What is the profit margin as a percentage of revenue?", optionA: "24%", optionB: "31.58%", optionC: "76%", optionD: "60%", correctAnswer: "A", explanation: "Profit = 250,000 − 190,000 = 60,000; margin = 60,000 ÷ 250,000 × 100 = 24%." },
  { qNo: 18, category: "Calculation", difficulty: "Easy", question: "A company invests ₹80,000 in a process improvement and earns ₹20,000 net profit from it. What is ROI?", optionA: "20%", optionB: "25%", optionC: "40%", optionD: "125%", correctAnswer: "B", explanation: "ROI = Net Profit ÷ Investment × 100 = 20,000 ÷ 80,000 × 100 = 25%." },
  { qNo: 19, category: "Calculation", difficulty: "Easy", question: "Monthly revenue increased from ₹400,000 to ₹460,000. What is the percentage increase?", optionA: "12%", optionB: "15%", optionC: "60%", optionD: "115%", correctAnswer: "B", explanation: "Increase = 60,000; percentage increase = 60,000 ÷ 400,000 × 100 = 15%." },
  { qNo: 20, category: "Calculation", difficulty: "Medium", question: "Five executives processed 38, 42, 40, 45, and 35 cases in a day. What is the average productivity per executive?", optionA: "38", optionB: "39", optionC: "40", optionD: "42", correctAnswer: "C", explanation: "Average = (38 + 42 + 40 + 45 + 35) ÷ 5 = 200 ÷ 5 = 40." },
];

const mcqSet2: McqData[] = [
  { qNo: 1, category: "Formula", difficulty: "Easy", question: "Department is in C2:C150 and Monthly Incentive is in H2:H150. Which formula totals incentive for the Sales department?", optionA: "=SUMIF(C2:C150,\"Sales\",H2:H150)", optionB: "=SUMIFS(C2:C150,\"Sales\",H2:H150)", optionC: "=COUNTIF(C2:C150,\"Sales\")", optionD: "=AVERAGEIF(C2:C150,\"Sales\",H2:H150)", correctAnswer: "A", explanation: "SUMIF applies one condition to C2:C150 and sums the corresponding H values." },
  { qNo: 2, category: "Formula", difficulty: "Medium", question: "Region is in B2:B120 and Achievement % is in G2:G120. Which formula returns the average achievement for the East region?", optionA: "=AVERAGE(B2:B120,\"East\",G2:G120)", optionB: "=AVERAGEIF(B2:B120,\"East\",G2:G120)", optionC: "=SUMIF(B2:B120,\"East\",G2:G120)", optionD: "=COUNTIF(B2:B120,\"East\",G2:G120)", correctAnswer: "B", explanation: "AVERAGEIF averages values in G2:G120 for rows where B2:B120 equals East." },
  { qNo: 3, category: "Formula", difficulty: "Medium", question: "A horizontal target table has months in B1:M1 and target values in B2:M2. Cell P1 contains a month name. Which formula returns the target using HLOOKUP?", optionA: "=HLOOKUP(P1,B1:M2,2,FALSE)", optionB: "=VLOOKUP(P1,B1:M2,2,FALSE)", optionC: "=HLOOKUP(P1,B2:M2,1,TRUE)", optionD: "=HLOOKUP(B1:M1,P1,2,FALSE)", correctAnswer: "A", explanation: "HLOOKUP searches the first row of B1:M2 and returns the matching value from row 2." },
  { qNo: 4, category: "Formula", difficulty: "Medium", question: "G2 contains Achievement %. Which formula returns \"Excellent\" for 100% or more, \"Near Target\" for 90% to below 100%, and \"Below Target\" otherwise?", optionA: "=IFS(G2>=1,\"Excellent\",G2>=0.9,\"Near Target\",TRUE,\"Below Target\")", optionB: "=IF(G2>=1,\"Excellent\",\"Near Target\",\"Below Target\")", optionC: "=IFS(G2<0.9,\"Excellent\",G2>=1,\"Below Target\",TRUE,\"Near Target\")", optionD: "=IF(G2>=0.9,\"Excellent\",IF(G2>=1,\"Near Target\",\"Below Target\"))", correctAnswer: "A", explanation: "IFS evaluates conditions in order; TRUE acts as the final default condition." },
  { qNo: 5, category: "Formula", difficulty: "Easy", question: "Status is in F2 and Priority is in G2. Which formula returns \"Review\" if Status is \"Pending\" OR Priority is \"High\"?", optionA: "=IF(AND(F2=\"Pending\",G2=\"High\"),\"Review\",\"OK\")", optionB: "=IF(OR(F2=\"Pending\",G2=\"High\"),\"Review\",\"OK\")", optionC: "=OR(IF(F2=\"Pending\"),IF(G2=\"High\"),\"Review\")", optionD: "=IF(F2=\"Pending\" OR G2=\"High\",\"Review\",\"OK\")", correctAnswer: "B", explanation: "OR returns TRUE when either condition is met, and IF maps that result to Review or OK." },
  { qNo: 6, category: "Formula", difficulty: "Medium", question: "Cell A2 contains \"EMP-NORTH-2045\". Which formula extracts \"NORTH\"?", optionA: "=LEFT(A2,5)", optionB: "=RIGHT(A2,5)", optionC: "=MID(A2,5,5)", optionD: "=MID(A2,4,5)", correctAnswer: "C", explanation: "Characters 5 through 9 are \"NORTH\", so MID(A2,5,5) returns the required text." },
  { qNo: 7, category: "Formula", difficulty: "Easy", question: "Cell B2 contains \"Pending - Old\". Which formula changes only the word \"Old\" to \"New\"?", optionA: "=SUBSTITUTE(B2,\"Old\",\"New\")", optionB: "=REPLACE(B2,\"Old\",\"New\")", optionC: "=TRIM(B2,\"Old\",\"New\")", optionD: "=SEARCH(B2,\"Old\",\"New\")", correctAnswer: "A", explanation: "SUBSTITUTE replaces matching text with new text." },
  { qNo: 8, category: "Formula", difficulty: "Easy", question: "Sales values are in G2:G50. Which formula returns the third-largest sales value?", optionA: "=MAX(G2:G50,3)", optionB: "=LARGE(G2:G50,3)", optionC: "=SMALL(G2:G50,3)", optionD: "=RANK(G2:G50,3)", correctAnswer: "B", explanation: "LARGE(array,k) returns the kth-largest value; k=3 gives the third largest." },
  { qNo: 9, category: "Formula", difficulty: "Medium", question: "A task starts on 10-Sep-2026 and needs 5 working days. Holidays are listed in H2:H5. Which formula returns the completion date, excluding weekends and those holidays?", optionA: "=NETWORKDAYS(DATE(2026,9,10),5,H2:H5)", optionB: "=WORKDAY(DATE(2026,9,10),5,H2:H5)", optionC: "=DATE(2026,9,10)+NETWORKDAYS(5,H2:H5)", optionD: "=DATEDIF(DATE(2026,9,10),5,\"d\")", correctAnswer: "B", explanation: "WORKDAY returns a future date after a specified number of working days and can exclude holidays." },
  { qNo: 10, category: "Formula", difficulty: "Challenging", question: "A report has been filtered and some rows are also manually hidden. Which formula sums only visible values in G2:G200, ignoring both filtered-out and manually hidden rows?", optionA: "=SUM(G2:G200)", optionB: "=SUBTOTAL(9,G2:G200)", optionC: "=SUBTOTAL(109,G2:G200)", optionD: "=SUMIF(G2:G200,\"Visible\")", correctAnswer: "C", explanation: "SUBTOTAL with function number 109 performs SUM while ignoring filtered rows and manually hidden rows." },
  { qNo: 11, category: "Scenario", difficulty: "Medium", question: "You receive a 150,000-row customer file with repeated customer IDs and need a duplicate count by ID. What is the best Excel approach?", optionA: "Manually scan the ID column", optionB: "Use COUNTIF/COUNTIFS or a PivotTable/Power Query-based check, then investigate IDs with counts greater than 1", optionC: "Sort only by customer name", optionD: "Delete every second row", correctAnswer: "B", explanation: "A systematic count or grouped transformation scales to large datasets and provides traceable duplicate identification." },
  { qNo: 12, category: "Scenario", difficulty: "Medium", question: "A branch report contains blank cells in the Sales column. The source owner says blanks may mean either zero sales or missing data. What should you do?", optionA: "Replace every blank with 0", optionB: "Delete all blank rows", optionC: "Clarify the business meaning/source rule before converting blanks, and separately flag unresolved missing values", optionD: "Use the average sales value for every blank", correctAnswer: "C", explanation: "Zero and missing data have different meanings; the treatment must follow a defined business rule." },
  { qNo: 13, category: "Scenario", difficulty: "Medium", question: "Two monthly reports have the same Order IDs but different revenue for a few orders. What is the most appropriate reconciliation method?", optionA: "Compare only the grand totals", optionB: "Match records using the unique Order ID and compare revenue at row level, then investigate variances", optionC: "Sort both files by revenue and compare row 1 to row 1", optionD: "Use employee names instead of Order IDs", correctAnswer: "B", explanation: "Reconciliation should use a stable unique key and compare relevant fields at transaction level." },
  { qNo: 14, category: "Scenario", difficulty: "Easy", question: "You discover that a formula range stops at row 500, but the current report has 560 rows. What should you do?", optionA: "Leave it because most rows are included", optionB: "Extend/correct the formula range or use a structured Excel Table, then revalidate totals", optionC: "Delete rows 501–560", optionD: "Copy the total from last month", correctAnswer: "B", explanation: "The formula must include all valid records; Tables or dynamic references help prevent future omissions." },
  { qNo: 15, category: "Scenario", difficulty: "Challenging", question: "A manager requests a KPI that has no agreed definition, and two teams calculate it differently. What is the best MIS response?", optionA: "Choose the higher number", optionB: "Use whichever formula is easier", optionC: "Document and agree the KPI definition, data source, filters, and calculation logic before publishing", optionD: "Average the two KPI values", correctAnswer: "C", explanation: "Consistent KPI definitions are essential for comparable and auditable MIS reporting." },
  { qNo: 16, category: "Calculation", difficulty: "Easy", question: "What is the simple interest on ₹120,000 at 8% per year for 2 years?", optionA: "₹9,600", optionB: "₹19,200", optionC: "₹20,736", optionD: "₹139,200", correctAnswer: "B", explanation: "Simple Interest = P × R × T = 120,000 × 8% × 2 = ₹19,200." },
  { qNo: 17, category: "Calculation", difficulty: "Medium", question: "₹100,000 is invested at 10% compound interest annually for 2 years. What is the compound interest earned?", optionA: "₹20,000", optionB: "₹21,000", optionC: "₹110,000", optionD: "₹121,000", correctAnswer: "B", explanation: "Amount = 100,000 × 1.10² = 121,000; compound interest = 121,000 − 100,000 = ₹21,000." },
  { qNo: 18, category: "Calculation", difficulty: "Easy", question: "A product with a list price of ₹2,400 receives a 15% discount. What is the final price?", optionA: "₹2,040", optionB: "₹2,060", optionC: "₹2,160", optionD: "₹2,250", correctAnswer: "A", explanation: "Discount = 2,400 × 15% = 360; final price = 2,400 − 360 = ₹2,040." },
  { qNo: 19, category: "Calculation", difficulty: "Easy", question: "An item costs ₹50,000 and is sold for ₹46,000. What is the loss percentage on cost?", optionA: "4%", optionB: "8%", optionC: "8.70%", optionD: "92%", correctAnswer: "B", explanation: "Loss = 4,000; loss % = 4,000 ÷ 50,000 × 100 = 8%." },
  { qNo: 20, category: "Calculation", difficulty: "Easy", question: "Actual output is 72 units against a target of 90 units. What is target achievement?", optionA: "72%", optionB: "80%", optionC: "90%", optionD: "125%", correctAnswer: "B", explanation: "Achievement = 72 ÷ 90 × 100 = 80%." },
];

const mcqSet3: McqData[] = [
  { qNo: 1, category: "Formula", difficulty: "Challenging", question: "Date is in A2:A500, Region in C2:C500, and Revenue in G2:G500. Which formula totals North-region revenue for August 2026?", optionA: "=SUMIFS(G2:G500,C2:C500,\"North\",A2:A500,\">=\"&DATE(2026,8,1),A2:A500,\"<=\"&DATE(2026,8,31))", optionB: "=SUMIF(G2:G500,C2:C500,\"North\",A2:A500,DATE(2026,8,1))", optionC: "=SUMIFS(C2:C500,\"North\",G2:G500,A2:A500,\"August\")", optionD: "=SUM(G2:G500,C2:C500=\"North\",MONTH(A2:A500)=8)", correctAnswer: "A", explanation: "SUMIFS can apply region plus start-date and end-date criteria while summing Revenue." },
  { qNo: 2, category: "Formula", difficulty: "Easy", question: "Employee IDs in A2:A100 are text values such as E101, E102, and some cells are blank. Which function counts the nonblank IDs?", optionA: "=COUNT(A2:A100)", optionB: "=COUNTA(A2:A100)", optionC: "=COUNTIF(A2:A100,0)", optionD: "=SUM(A2:A100)", correctAnswer: "B", explanation: "COUNTA counts nonblank cells, including text IDs; COUNT counts numeric cells only." },
  { qNo: 3, category: "Formula", difficulty: "Medium", question: "B2 is Revenue, C2 is Target, and D2 is Data Quality Status. Which formula returns \"Valid Achievement\" only when Revenue is at least Target and D2 equals \"OK\"?", optionA: "=IF(AND(B2>=C2,D2=\"OK\"),\"Valid Achievement\",\"Review\")", optionB: "=IF(OR(B2>=C2,D2=\"OK\"),\"Valid Achievement\",\"Review\")", optionC: "=AND(IF(B2>=C2,D2=\"OK\"),\"Valid Achievement\")", optionD: "=IF(B2>=C2,D2=\"OK\",\"Valid Achievement\")", correctAnswer: "A", explanation: "AND ensures both achievement and data-quality conditions are satisfied." },
  { qNo: 4, category: "Formula", difficulty: "Medium", question: "Order IDs are in A2:A80. Which formula returns the exact position of the Order ID stored in F2?", optionA: "=MATCH(F2,A2:A80,1)", optionB: "=MATCH(F2,A2:A80,0)", optionC: "=INDEX(F2,A2:A80,0)", optionD: "=SEARCH(F2,A2:A80)", correctAnswer: "B", explanation: "MATCH with match_type 0 performs an exact match." },
  { qNo: 5, category: "Formula", difficulty: "Medium", question: "Which formula looks up the Customer ID in E2 against A2:A200, returns the Status from D2:D200, and returns \"Missing\" when no ID is found?", optionA: "=XLOOKUP(E2,A2:A200,D2:D200,\"Missing\")", optionB: "=XLOOKUP(A2:A200,E2,D2:D200,\"Missing\")", optionC: "=VLOOKUP(E2,D2:A200,4,FALSE)", optionD: "=IFERROR(MATCH(E2,A2:A200,0),\"Missing\")", correctAnswer: "A", explanation: "XLOOKUP supports a separate return array and an explicit not-found value." },
  { qNo: 6, category: "Formula", difficulty: "Medium", question: "Cell A2 contains \"Branch-East\". Which formula returns the starting position of \"east\" regardless of case?", optionA: "=FIND(\"east\",A2)", optionB: "=SEARCH(\"east\",A2)", optionC: "=MATCH(\"east\",A2,0)", optionD: "=LEN(\"east\",A2)", correctAnswer: "B", explanation: "SEARCH is case-insensitive; FIND is case-sensitive." },
  { qNo: 7, category: "Formula", difficulty: "Easy", question: "A calculated requirement is 12.01 cartons, and the business rule is to always order a whole carton by rounding upward. Which formula should be used?", optionA: "=ROUND(A2,0)", optionB: "=ROUNDDOWN(A2,0)", optionC: "=ROUNDUP(A2,0)", optionD: "=INT(A2)", correctAnswer: "C", explanation: "ROUNDUP rounds away from zero, so 12.01 becomes 13." },
  { qNo: 8, category: "Formula", difficulty: "Medium", question: "Joining date is in B2 and the report date is in C2. Which formula returns completed years of service?", optionA: "=DATEDIF(B2,C2,\"y\")", optionB: "=YEAR(C2)-YEAR(B2)+1", optionC: "=DATEDIF(B2,C2,\"m\")", optionD: "=NETWORKDAYS(B2,C2)/365", correctAnswer: "A", explanation: "DATEDIF with unit \"y\" returns the number of complete years between the dates." },
  { qNo: 9, category: "Formula", difficulty: "Challenging", question: "Region is in B2:B100 and Status is in F2:F100. Which modern Excel formula returns only rows A2:G100 where Region is East and Status is Active?", optionA: "=FILTER(A2:G100,(B2:B100=\"East\")*(F2:F100=\"Active\"),\"No rows\")", optionB: "=SORT(A2:G100,B2:B100=\"East\",F2:F100=\"Active\")", optionC: "=UNIQUE(A2:G100,(B2:B100=\"East\")*(F2:F100=\"Active\"))", optionD: "=FILTER(B2:B100,\"East\",F2:F100,\"Active\")", correctAnswer: "A", explanation: "FILTER uses a Boolean include array; multiplication represents AND between the two conditions." },
  { qNo: 10, category: "Formula", difficulty: "Challenging", question: "In formula =$B2*C$1 entered in D2 and copied one column right and one row down to E3, what does it become?", optionA: "=$B3*D$1", optionB: "=C3*$C2", optionC: "=$B2*D$1", optionD: "=B3*D1", correctAnswer: "A", explanation: "$B fixes column B while row 2 becomes 3; C$1 allows the column to move to D while row 1 stays fixed." },
  { qNo: 11, category: "Scenario", difficulty: "Medium", question: "A weekly report suddenly shows a 40% jump in revenue, but transaction count is almost unchanged. What should you investigate first?", optionA: "Assume performance improved", optionB: "Check for unit/scale changes, duplicate values, unusually large transactions, and source-system changes before publishing", optionC: "Reduce revenue by 40%", optionD: "Remove the highest transactions", correctAnswer: "B", explanation: "A large movement without a corresponding volume change is a signal to validate units, duplicates, outliers, and source changes." },
  { qNo: 12, category: "Scenario", difficulty: "Challenging", question: "You need to combine files from 20 branches every week, with the same structure and folder location. What is the best long-term approach?", optionA: "Open and copy each file manually", optionB: "Use a repeatable Power Query/consolidation process with schema checks and exception reporting", optionC: "Ask each branch to send screenshots", optionD: "Create 20 separate totals and add them on a calculator", correctAnswer: "B", explanation: "A repeatable consolidation process reduces manual effort and supports validation and exception handling." },
  { qNo: 13, category: "Scenario", difficulty: "Medium", question: "A lookup returns #N/A for some valid-looking customer IDs. What should you check before changing the formula?", optionA: "Only the font color", optionB: "Leading/trailing spaces, text-vs-number type differences, hidden characters, and whether the key exists in the lookup table", optionC: "Increase column width", optionD: "Round the sales value", correctAnswer: "B", explanation: "Lookup failures often come from key cleanliness/type mismatches or genuinely missing keys." },
  { qNo: 14, category: "Scenario", difficulty: "Easy", question: "A report contains a calculated total but no record of source file, report date, or filters used. What improvement is most important?", optionA: "Add decorative colors", optionB: "Add report metadata such as source, period, refresh time, filters, and version/owner", optionC: "Reduce decimal places", optionD: "Move the total to another sheet", correctAnswer: "B", explanation: "Report metadata improves traceability, reproducibility, and auditability." },
  { qNo: 15, category: "Scenario", difficulty: "Medium", question: "You identify a missing row after a report has already been shared with management. What is the best action?", optionA: "Ignore it if the amount is small", optionB: "Correct the report, quantify the impact, communicate the revision, and document the cause/preventive check", optionC: "Delete a different row to keep the same total", optionD: "Wait until next month", correctAnswer: "B", explanation: "MIS corrections should be transparent and accompanied by impact and root-cause/prevention information." },
  { qNo: 16, category: "Calculation", difficulty: "Easy", question: "A team sells 125 units at ₹800 per unit. What is total revenue?", optionA: "₹90,000", optionB: "₹100,000", optionC: "₹125,800", optionD: "₹1,000,000", correctAnswer: "B", explanation: "Revenue = Quantity × Unit Price = 125 × 800 = ₹100,000." },
  { qNo: 17, category: "Calculation", difficulty: "Easy", question: "Revenue is ₹300,000 and profit is ₹75,000. What is the profit margin on revenue?", optionA: "20%", optionB: "25%", optionC: "30%", optionD: "40%", correctAnswer: "B", explanation: "Profit margin = 75,000 ÷ 300,000 × 100 = 25%." },
  { qNo: 18, category: "Calculation", difficulty: "Easy", question: "Monthly defects decreased from 250 to 225. What is the percentage decrease?", optionA: "5%", optionB: "10%", optionC: "11.11%", optionD: "25%", correctAnswer: "B", explanation: "Decrease = 25; percentage decrease = 25 ÷ 250 × 100 = 10%." },
  { qNo: 19, category: "Calculation", difficulty: "Easy", question: "Monthly sales for four months are ₹180,000, ₹210,000, ₹195,000, and ₹215,000. What is the average monthly sales?", optionA: "₹195,000", optionB: "₹200,000", optionC: "₹205,000", optionD: "₹800,000", correctAnswer: "B", explanation: "Total = ₹800,000; average = 800,000 ÷ 4 = ₹200,000." },
  { qNo: 20, category: "Calculation", difficulty: "Easy", question: "Quarterly target is ₹1,200,000 and actual is ₹1,050,000. What is the shortfall?", optionA: "₹50,000", optionB: "₹100,000", optionC: "₹150,000", optionD: "₹250,000", correctAnswer: "C", explanation: "Shortfall = Target − Actual = 1,200,000 − 1,050,000 = ₹150,000." },
];

const mcqSet4: McqData[] = [
  { qNo: 1, category: "Formula", difficulty: "Medium", question: "Order IDs are in A2:A500. Which formula entered in B2 can be copied down to flag an ID as \"Duplicate\" when it appears more than once?", optionA: "=IF(COUNTIF($A$2:$A$500,A2)>1,\"Duplicate\",\"Unique\")", optionB: "=IF(COUNTA(A2)>1,\"Duplicate\",\"Unique\")", optionC: "=COUNTIFS(A2,\"Duplicate\",$A$2:$A$500)", optionD: "=IF(MATCH(A2,$A$2:$A$500,0)>1,\"Duplicate\",\"Unique\")", correctAnswer: "A", explanation: "COUNTIF counts how many times the current ID appears in the full ID range; more than one means duplicate." },
  { qNo: 2, category: "Formula", difficulty: "Medium", question: "Branch is in C2:C200 and Processing Time is in H2:H200. Which formula returns the average processing time for Branch B01?", optionA: "=SUMIF(C2:C200,\"B01\",H2:H200)", optionB: "=AVERAGEIF(C2:C200,\"B01\",H2:H200)", optionC: "=COUNTIF(C2:C200,\"B01\",H2:H200)", optionD: "=AVERAGE(C2:C200,\"B01\",H2:H200)", correctAnswer: "B", explanation: "AVERAGEIF averages the H values corresponding to rows where C equals B01." },
  { qNo: 3, category: "Formula", difficulty: "Challenging", question: "Customer IDs are in A2:A100 and Credit Limit is in D2:D100. Which formula returns the limit for ID in G2 using INDEX/MATCH and displays 0 if no match exists?", optionA: "=IFERROR(INDEX(D2:D100,MATCH(G2,A2:A100,0)),0)", optionB: "=IFERROR(MATCH(D2:D100,INDEX(G2,A2:A100,0)),0)", optionC: "=INDEX(IFERROR(D2:D100,0),MATCH(G2,A2:A100,1))", optionD: "=VLOOKUP(G2,D2:A100,4,FALSE)", correctAnswer: "A", explanation: "INDEX/MATCH performs the exact lookup, and IFERROR replaces any lookup error with 0." },
  { qNo: 4, category: "Formula", difficulty: "Medium", question: "A2:A5 contains employee names, and some cells may be blank. Which formula joins the nonblank names with a comma and space between each name?", optionA: "=CONCAT(A2:A5,\", \")", optionB: "=TEXTJOIN(\", \",TRUE,A2:A5)", optionC: "=CONCATENATE(\", \",A2:A5)", optionD: "=JOIN(A2:A5,\", \")", correctAnswer: "B", explanation: "TEXTJOIN supports a delimiter and can ignore blank cells when ignore_empty is TRUE." },
  { qNo: 5, category: "Formula", difficulty: "Easy", question: "Cell A2 contains \"ORD-2026-4587\". Which formula extracts the final four characters \"4587\"?", optionA: "=LEFT(A2,4)", optionB: "=RIGHT(A2,4)", optionC: "=MID(A2,4,4)", optionD: "=LEN(A2,4)", correctAnswer: "B", explanation: "RIGHT(A2,4) returns the last four characters." },
  { qNo: 6, category: "Formula", difficulty: "Easy", question: "Sales values are in G2:G100. Which formula returns the second-smallest sales value?", optionA: "=MIN(G2:G100,2)", optionB: "=SMALL(G2:G100,2)", optionC: "=LARGE(G2:G100,2)", optionD: "=SORT(G2:G100,2)", correctAnswer: "B", explanation: "SMALL(array,2) returns the second-smallest value." },
  { qNo: 7, category: "Formula", difficulty: "Medium", question: "Which formula displays today's date as text in the format 09-Sep-2026 (assuming today is 9-Sep-2026)?", optionA: "=DATE(TODAY(),\"dd-mmm-yyyy\")", optionB: "=TEXT(TODAY(),\"dd-mmm-yyyy\")", optionC: "=TODAY(\"dd-mmm-yyyy\")", optionD: "=FORMAT(TODAY(),\"dd-mmm-yyyy\")", correctAnswer: "B", explanation: "TEXT formats a date value according to the supplied number format string." },
  { qNo: 8, category: "Formula", difficulty: "Easy", question: "Customer names are in B2:B300 with duplicates. Which formula returns each customer name once in modern Excel?", optionA: "=UNIQUE(B2:B300)", optionB: "=DISTINCT(B2:B300)", optionC: "=FILTER(B2:B300,\"Unique\")", optionD: "=COUNTIF(B2:B300,1)", correctAnswer: "A", explanation: "UNIQUE returns the distinct values from the range." },
  { qNo: 9, category: "Formula", difficulty: "Medium", question: "A2:D100 is an MIS table and column D contains Revenue. Which formula sorts the entire table by Revenue from highest to lowest?", optionA: "=SORT(A2:D100,4,-1)", optionB: "=SORT(A2:D100,D2:D100,\"DESC\")", optionC: "=FILTER(A2:D100,4,-1)", optionD: "=SORT(D2:D100,A2:D100,-1)", correctAnswer: "A", explanation: "SORT(array,sort_index,sort_order) with sort_index 4 and order -1 sorts by column D descending." },
  { qNo: 10, category: "Formula", difficulty: "Easy", question: "A2 contains First Name and B2 contains Last Name. Which formula returns the full name with one space between them?", optionA: "=CONCAT(A2,\" \",B2)", optionB: "=SUM(A2,\" \",B2)", optionC: "=TEXTJOIN(A2,B2)", optionD: "=LEFT(A2)&RIGHT(B2)", correctAnswer: "A", explanation: "CONCAT combines the two cell values and the literal space." },
  { qNo: 11, category: "Scenario", difficulty: "Medium", question: "An inventory MIS has negative closing stock for several SKUs. What should you do before reporting them as stock-outs?", optionA: "Replace negatives with zero", optionB: "Validate opening stock, receipts, issues/sales, timing cut-offs, returns, and transaction completeness", optionC: "Delete negative rows", optionD: "Increase opening stock until closing is positive", correctAnswer: "B", explanation: "Negative stock can reflect genuine timing or data issues; the transaction flow should be reconciled before interpretation." },
  { qNo: 12, category: "Scenario", difficulty: "Challenging", question: "A management dashboard shows different totals depending on who refreshes it. What is the most likely control improvement?", optionA: "Use larger fonts", optionB: "Standardize source paths, refresh steps, filters, calculation logic, and version control", optionC: "Ask everyone to round totals", optionD: "Stop refreshing the dashboard", correctAnswer: "B", explanation: "A controlled refresh process and consistent filters/sources eliminate user-dependent results." },
  { qNo: 13, category: "Scenario", difficulty: "Medium", question: "A customer file contains names such as \"ABC Ltd\", \"ABC LTD \", and \"abc ltd\" for the same customer. What is the best preprocessing step before matching?", optionA: "Delete all but the first row", optionB: "Normalize text using trimming and consistent case, then match using a reliable unique key when available", optionC: "Sort by name length", optionD: "Convert sales to text", correctAnswer: "B", explanation: "Text normalization reduces false mismatches, while a stable unique key is preferable to names for reconciliation." },
  { qNo: 14, category: "Scenario", difficulty: "Easy", question: "You are asked to send a weekly report at 10:00 AM every Monday. Which practice most reduces the risk of late or inconsistent reporting?", optionA: "Build the report from scratch each Monday", optionB: "Maintain a documented repeatable process/template with scheduled data refresh and pre-send validation", optionC: "Send last week's report if data is late", optionD: "Remove validation checks to save time", correctAnswer: "B", explanation: "A standardized recurring workflow supports timeliness and consistency without sacrificing controls." },
  { qNo: 15, category: "Scenario", difficulty: "Medium", question: "A formula produces #DIV/0! because some records have zero target. What is the most appropriate handling?", optionA: "Replace every error with 100%", optionB: "Use a business-approved rule, such as IF/IFERROR to return blank or a defined label for zero-target cases, and document it", optionC: "Delete zero-target records", optionD: "Change zero targets to 1", correctAnswer: "B", explanation: "Zero denominators require an explicit business rule; error handling should not invent performance." },
  { qNo: 16, category: "Calculation", difficulty: "Medium", question: "₹200,000 is invested at 5% compound interest annually for 2 years. What compound interest is earned?", optionA: "₹20,000", optionB: "₹20,500", optionC: "₹21,000", optionD: "₹220,500", correctAnswer: "B", explanation: "Amount = 200,000 × 1.05² = 220,500; interest = 220,500 − 200,000 = ₹20,500." },
  { qNo: 17, category: "Calculation", difficulty: "Easy", question: "A service costs ₹320,000 to deliver and generates ₹400,000 revenue. What is profit percentage on cost?", optionA: "20%", optionB: "25%", optionC: "80%", optionD: "125%", correctAnswer: "B", explanation: "Profit = 80,000; profit % on cost = 80,000 ÷ 320,000 × 100 = 25%." },
  { qNo: 18, category: "Calculation", difficulty: "Easy", question: "A project requires ₹300,000 investment and generates ₹90,000 net profit. What is ROI?", optionA: "23.08%", optionB: "30%", optionC: "33.33%", optionD: "130%", correctAnswer: "B", explanation: "ROI = 90,000 ÷ 300,000 × 100 = 30%." },
  { qNo: 19, category: "Calculation", difficulty: "Easy", question: "Quarterly revenue rises from ₹1.5 million to ₹1.8 million. What is the growth rate?", optionA: "16.67%", optionB: "20%", optionC: "30%", optionD: "120%", correctAnswer: "B", explanation: "Growth = 0.3 million ÷ 1.5 million × 100 = 20%." },
  { qNo: 20, category: "Calculation", difficulty: "Easy", question: "A team of 12 representatives processes 960 orders in a day. What is average productivity per representative?", optionA: "70 orders", optionB: "75 orders", optionC: "80 orders", optionD: "90 orders", correctAnswer: "C", explanation: "Productivity = 960 ÷ 12 = 80 orders per representative." },
];

const allSets = [
  { code: "SET1", name: "MCQ Set 1", data: mcqSet1, practicalFile: "MIS_Executive_Practical_Set_1.xlsx", practicalTitle: "Sales MIS Practical Assessment" },
  { code: "SET2", name: "MCQ Set 2", data: mcqSet2, practicalFile: "MIS_Executive_Practical_Set_2.xlsx", practicalTitle: "Employee Attendance MIS Practical Assessment" },
  { code: "SET3", name: "MCQ Set 3", data: mcqSet3, practicalFile: "MIS_Executive_Practical_Set_3.xlsx", practicalTitle: "Inventory MIS Practical Assessment" },
  { code: "SET4", name: "MCQ Set 4", data: mcqSet4, practicalFile: "MIS_Executive_Practical_Set_4.xlsx", practicalTitle: "Regional Performance MIS Practical Assessment" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@123", 12);
  await prisma.admin.upsert({
    where: { email: process.env.ADMIN_EMAIL || "admin@kapp.com" },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || "admin@kapp.com",
      name: "Assessment Admin",
      hashedPassword,
    },
  });
  console.log("✅ Admin user created");

  // Create assessment
  const assessment = await prisma.assessment.upsert({
    where: { id: "mis-executive-assessment" },
    update: {},
    create: {
      id: "mis-executive-assessment",
      name: "MIS Executive Assessment",
      description: "Comprehensive MIS Executive hiring assessment with MCQ and practical components.",
      instructions: `## Assessment Instructions

### Overview
This is a timed assessment for the MIS Executive position. It consists of two parts:

**Part 1: MCQ Assessment (20 questions)**
- 10 Excel Formula-Based Questions
- 5 Scenario-Based Questions
- 5 Calculation-Based Questions
- Each question carries 1 mark
- Select exactly one answer (A, B, C, or D) for each question

**Part 2: Practical Excel Assessment (5 tasks)**
- Download the provided Excel workbook
- Complete the practical tasks using Microsoft Excel
- Upload your completed workbook

### Important Rules
- The total assessment duration is **45 minutes** for both parts
- The timer starts when you click "Start Test"
- Your answers are saved automatically as you select them
- You can navigate between questions and change answers before submission
- Once submitted, you cannot modify your answers
- If time expires, your current answers will be automatically saved
- Do not refresh or close the browser unnecessarily
- Ensure stable internet connectivity throughout the assessment`,
      durationMins: 45,
      active: true,
      mcqPassingScore: 10,
      practicalPassingScore: 10,
      overallPassingScore: 22,
      totalMcqMarks: 20,
      totalPracticalMarks: 20,
    },
  });
  console.log("✅ Assessment created");

  // Create question sets, questions, options, answer keys, and practical assessments
  for (let si = 0; si < allSets.length; si++) {
    const setInfo = allSets[si];
    console.log(`📝 Seeding ${setInfo.name}...`);

    const questionSet = await prisma.questionSet.upsert({
      where: { assessmentId_code: { assessmentId: assessment.id, code: setInfo.code } },
      update: {},
      create: {
        assessmentId: assessment.id,
        name: setInfo.name,
        code: setInfo.code,
        orderIndex: si,
      },
    });

    for (const q of setInfo.data) {
      const question = await prisma.question.upsert({
        where: { questionSetId_orderIndex: { questionSetId: questionSet.id, orderIndex: q.qNo } },
        update: {
          category: q.category,
          difficulty: q.difficulty,
          questionText: q.question,
          marks: 1,
        },
        create: {
          questionSetId: questionSet.id,
          category: q.category,
          difficulty: q.difficulty,
          questionText: q.question,
          marks: 1,
          orderIndex: q.qNo,
        },
      });

      const options = [
        { label: "A", text: q.optionA },
        { label: "B", text: q.optionB },
        { label: "C", text: q.optionC },
        { label: "D", text: q.optionD },
      ];

      let correctOptionId = "";
      for (const opt of options) {
        const option = await prisma.questionOption.upsert({
          where: { questionId_label: { questionId: question.id, label: opt.label } },
          update: { optionText: opt.text },
          create: {
            questionId: question.id,
            label: opt.label,
            optionText: opt.text,
          },
        });
        if (opt.label === q.correctAnswer) {
          correctOptionId = option.id;
        }
      }

      await prisma.answerKey.upsert({
        where: { questionId: question.id },
        update: { correctOptionId, explanation: q.explanation },
        create: {
          questionId: question.id,
          correctOptionId,
          explanation: q.explanation,
        },
      });
    }

    // Practical assessment
    await prisma.practicalAssessment.upsert({
      where: { assessmentId_setCode: { assessmentId: assessment.id, setCode: setInfo.code } },
      update: {},
      create: {
        assessmentId: assessment.id,
        setCode: setInfo.code,
        title: setInfo.practicalTitle,
        maxMarks: 20,
        originalFile: setInfo.practicalFile,
        instructions: "Use Microsoft Excel formulas/functions where appropriate; preserve source data except where a task explicitly requires correction; enter final answers in the designated answer cells.",
      },
    });

    console.log(`✅ ${setInfo.name} seeded (${setInfo.data.length} questions)`);
  }

  console.log("\n🎉 Database seeding complete!");
  console.log("📊 Total: 4 sets × 20 questions = 80 MCQs");
  console.log("📁 4 practical assessment workbooks configured");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
