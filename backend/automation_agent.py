import sys
import os
import json
import traceback
import io
import difflib
import csv
import asyncio
import threading
from playwright.async_api import async_playwright

# Set UTF-8 encoding for stdout and stderr
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

class WebAutomationAgent:
    def __init__(self):
        self.playwright = None
        self.context = None
        self.page = None
        self.loop = None
        self.thread = None
        self.students = []
        self.term = None
        self.exam = None
        self.exam_file_path = None
        self.start_async_loop()
        self.load_csv_data()

    def log(self, message):
        print(f"[LOG] {message}", file=sys.stderr)

    def update_status(self, text, color="blue"):
        print(f"[STATUS] {text}", file=sys.stderr)

    def start_async_loop(self):
        """Start the asyncio event loop in a separate thread"""
        def run_loop():
            self.loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self.loop)
            self.loop.run_forever()
        
        self.thread = threading.Thread(target=run_loop, daemon=True)
        self.thread.start()

    def load_csv_data(self):
        """Load CSV data exactly like agent.py does"""
        try:
            # Get the macro directory from command line argument
            if len(sys.argv) > 1:
                macro_dir = sys.argv[1]
            else:
                macro_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'Make-Up-Exam-Macro')
            
            csv_path = os.path.join(macro_dir, 'Students.csv')
            if not os.path.exists(csv_path):
                self.log("CSV file not found")
                return

            with open(csv_path, 'r', encoding='utf-8-sig') as file:
                lines = [line.strip() for line in file if line.strip()]

            if len(lines) < 4:
                self.log("CSV missing required rows")
                return

            # Parse exactly like agent.py
            header_row = [x.strip() for x in lines[0].split(',')]
            data_row = [x.strip() for x in lines[1].split(',')]

            if 'Term' not in header_row or 'Exam' not in header_row:
                self.log("CSV missing 'Term' or 'Exam' headers")
                return

            term_index = header_row.index('Term')
            exam_index = header_row.index('Exam')
            self.term = data_row[term_index]
            self.exam = data_row[exam_index]

            student_headers = [x.strip() for x in lines[2].split(',')]
            csv_data = lines[3:]
            reader = csv.DictReader(csv_data, fieldnames=student_headers)

            for row in reader:
                if not row.get('Class') or not row.get('Name'):
                    continue
                self.students.append(row)

            if self.students and self.term and self.exam:
                self.log(f"✅ Loaded {len(self.students)} student(s) from CSV")
                self.log(f"📘 Term: {self.term}, Exam: {self.exam}")
                for s in self.students:
                    self.log(f"  Class: {s['Class']}, Name: {s['Name']}, Start: {s['Start Date']}, End: {s['End Date']}, Hours: {s['Hours']}, Minutes: {s['Minutes']}, Specify: {s['Specify']}")
            else:
                self.log("⚠️ CSV missing term, exam, or student rows")

        except Exception as e:
            self.log(f"❌ Error reading CSV: {e}")

    async def select_student(self, student_name):
        """Student selection logic from agent.py"""
        await self.page.wait_for_selector("iframe[name^='ptModFrame_']", timeout=10000)
        lookup_frame = None
        for f in self.page.frames:
            if f.name and f.name.startswith("ptModFrame_"):
                lookup_frame = f
                break
        if not lookup_frame:
            self.log("Could not find student lookup frame")
            return

        await lookup_frame.wait_for_selector("a.PSSRCHRESULTSODDROW, a.PSSRCHRESULTSEVENROW", timeout=10000)
        links = await lookup_frame.query_selector_all("a.PSSRCHRESULTSODDROW, a.PSSRCHRESULTSEVENROW")

        best_match = None
        best_ratio = 0.0
        best_text = ""
        for link in links:
            text = (await link.inner_text()).strip().lower()
            ratio = difflib.SequenceMatcher(None, text, student_name.lower()).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = link
                best_text = text

        if best_match and best_ratio > 0.5:
            await best_match.click()
            self.log(f"Selected best match '{best_text}' for {student_name} (score {best_ratio:.2f})")
        else:
            self.log(f"No good match found for {student_name}. Best score: {best_ratio:.2f}")

    async def automate_form(self):
        """Complete automation logic from agent.py"""
        try:
            self.log("Starting browser automation...")
            
            # Initialize Playwright
            self.playwright = await async_playwright().start()
            
            # Connect to existing browser session (the one you logged into)
            self.log("🔍 Attempting to connect to existing browser session...")
            
            try:
                # Wait a moment for browser to be ready
                await asyncio.sleep(2)
                
                # Try to connect to existing browser first
                browser = await self.playwright.chromium.connect_over_cdp("http://localhost:9222")
                self.log("✅ Connected to existing browser session")
                
                # Get existing contexts and pages
                contexts = browser.contexts
                if contexts:
                    self.context = contexts[0]
                    self.log("✅ Using existing browser context")
                    
                    pages = self.context.pages
                    if pages:
                        self.page = pages[0]
                        self.log("✅ Using existing browser page")
                    else:
                        self.page = await self.context.new_page()
                        self.log("✅ Created new page in existing context")
                else:
                    self.context = await browser.new_context()
                    self.page = await self.context.new_page()
                    self.log("✅ Created new context and page in existing browser")
                    
            except Exception as e:
                self.log(f"❌ Could not connect to existing browser: {str(e)}")
                self.log("🚀 Launching new browser with debugging port...")
                
                # If no existing browser, launch new one with debugging port
                browser = await self.playwright.chromium.launch(
                    headless=False,
                    args=['--remote-debugging-port=9222', '--user-data-dir=%TEMP%\\chrome_debug', '--window-position=-1920,0', '--window-size=1920,1080']
                )
                self.log("✅ Launched new browser with debugging port")
                
                self.context = await browser.new_context()
                self.page = await self.context.new_page()
            
            # Navigate to form page exactly like agent.py
            await self.page.goto("https://my.lonestar.edu/psp/ihprd/EMPLOYEE/EMPL/c/LSC_TCR.LSC_TCRFORMS.GBL", wait_until='networkidle', timeout=10000)
            await asyncio.sleep(3)

            # Group students by class exactly like agent.py
            class_groups = {}
            for s in self.students:
                class_groups.setdefault(s['Class'], []).append(s)

            # Process each class group exactly like agent.py
            for class_code, students in class_groups.items():
                self.log(f"Processing class {class_code} with {len(students)} students")
                
                # Refresh page for each new class to ensure clean state
                if class_code != list(class_groups.keys())[0]:  # Not the first class
                    self.log("Refreshing page for new class...")
                    await self.page.reload()
                    await asyncio.sleep(3)
                
                # Find the TargetContent iframe
                frame = self.page.frame(name="TargetContent")
                if not frame:
                    self.log("ERROR: Could not find TargetContent iframe")
                    continue

                # Fill basic form fields exactly like agent.py
                await frame.fill("#LSC_TCRFRMA_VW_LSC_TERM", self.term)
                await frame.fill("#LSC_TCRFRMA_VW_LSC_TCTESTNAME", self.exam)

                # Click add button
                await frame.click("#PTS_CFG_CL_WRK_PTS_ADD_BTN", timeout=10000)
                await asyncio.sleep(2)

                # Fill form details exactly like agent.py
                await frame.fill("#LSC_TCRFORMS_LSC_OFFICELOCATION", "F255")
                await frame.fill("#LSC_TCRFORMS_LSC_BACKPHONE", "281-636-7774")
                await frame.fill("#LSC_TCRFORMS_LSC_CAMPUS", "400")
                await frame.check("input[name='LSC_TCRFORMS_LSC_TCCRSEINFO'][value='C']")
                await frame.check("#LSC_TCR_WEBCAMACK")
                await frame.check("#LSC_TCR_EXAMACK1")
                await frame.fill("#LSC_TCRFORMS_LSC_TCCRSENBR", class_code)

                # Click individual student button
                await frame.click("#LSC_TCRFORMS_LSC_TCRINDSTU", timeout=10000)
                await asyncio.sleep(1)

                # Process each student exactly like agent.py
                for i, student in enumerate(students):
                    magnifier_selector = f"#LSC_TCRFORMSTU_LSC_SEMPLID\\$prompt\\$img\\${i}"
                    try:
                        await frame.wait_for_selector(magnifier_selector, timeout=10000)
                        await frame.click(magnifier_selector, timeout=10000)
                        await self.select_student(student['Name'])
                        self.log(f"🔍 Selected student {student['Name']} in row {i}")
                    except Exception as e:
                        self.log(f"⚠️ Could not find magnifier for row {i} ({student['Name']}): {str(e)}")

                    # Add new row if not the last student
                    if i < len(students) - 1:
                        try:
                            await frame.click("a[id^='LSC_TCRFORMSTU$new']", timeout=10000)
                            await asyncio.sleep(1)
                        except Exception as e:
                            self.log(f"⚠️ Could not click '+' to add new row: {str(e)}")

                # Fill exam details for first student exactly like agent.py
                first_student = students[0]
                await frame.check("#EXAM_TEST")
                await frame.fill("#LSC_TCRFORMS_LSC_STARTDATE", first_student['Start Date'])
                await frame.fill("#LSC_TCRFORMS_LSC_ENDDATE", first_student['End Date'])
                await frame.fill("#LSC_TCRFORMS_LSC_TCLIMITHOUR", first_student['Hours'])
                await frame.fill("#LSC_TCRFORMS_LSC_TCLIMITMINUTE", first_student['Minutes'])
                await frame.check("#LSC_TCTESTPICKUP_E")
                await frame.check("#MAT_SCRATCHPAPER")

                # Set calculator type based on class exactly like agent.py
                calc_type = "Scientific" if "1314" in class_code else ("Any" if "1324" in class_code else "None")
                await frame.select_option("#LSC_TCRFORMS_LSC_TCCALCULATOR", label=calc_type)

                # Fill specify field if provided
                if first_student['Specify'].strip():
                    await frame.fill("#LSC_TCRFORMS_LSC_TCOTHER1", first_student['Specify'])

                await frame.check("#LSC_TCRFORMCAMP_LSC_TCRSELECTCAMPU\\$11")

                # ✅ File upload with multiple fallback approaches
                try:
                    self.log("📎 Clicking Add Attachment button...")
                    await frame.click("#LSC_TCRFIATT_WK_ATTACHADD", timeout=10000)
                    self.log("✅ Add Attachment button clicked")

                    # Wait for modal to appear
                    self.log("🔍 Waiting for modal to appear...")
                    await asyncio.sleep(2)
                    
                    # Try multiple approaches to find and interact with file input
                    file_input = None
                    
                    # Approach 1: Look for file input in modal
                    try:
                        await self.page.wait_for_selector("#pt_modals", timeout=5000)
                        file_input = await self.page.query_selector("input[name='#ICOrigFileName']")
                        if file_input:
                            self.log("✅ Found file input in modal")
                    except:
                        self.log("⚠️ Modal approach failed, trying alternatives...")
                    
                    # Approach 2: Look for any file input on the page
                    if not file_input:
                        file_input = await self.page.query_selector("input[type='file']")
                        if file_input:
                            self.log("✅ Found file input on page")
                    
                    # Approach 3: Look in all frames
                    if not file_input:
                        for frame in self.page.frames:
                            try:
                                file_input = await frame.query_selector("input[type='file']")
                                if file_input:
                                    self.log("✅ Found file input in frame")
                                    break
                            except:
                                continue
                    
                    if file_input:
                        self.log("📎 Setting file...")
                        await file_input.set_input_files(self.exam_file_path)
                        self.log("✅ File attached")
                        
                        # Wait and click upload button
                        await asyncio.sleep(2)
                        
                        # Try multiple approaches to find upload button
                        upload_button = None
                        
                        # Approach 1: Look for #Upload button
                        upload_button = await self.page.query_selector("#Upload")
                        if upload_button:
                            self.log("✅ Found #Upload button")
                        else:
                            # Approach 2: Look for any button with "Upload" text
                            upload_button = await self.page.query_selector("button:has-text('Upload')")
                            if upload_button:
                                self.log("✅ Found Upload button by text")
                            else:
                                # Approach 3: Look in all frames for upload button
                                for frame in self.page.frames:
                                    try:
                                        upload_button = await frame.query_selector("#Upload")
                                        if not upload_button:
                                            upload_button = await frame.query_selector("button:has-text('Upload')")
                                        if upload_button:
                                            self.log("✅ Found Upload button in frame")
                                            break
                                    except:
                                        continue
                        
                        if upload_button:
                            await upload_button.click()
                            self.log("✅ Upload button clicked")
                            await asyncio.sleep(3)  # Wait for upload to complete
                        else:
                            self.log("❌ Upload button not found anywhere")
                            return
                        
                        await asyncio.sleep(3)
                        self.log("✅ File upload completed")
                    else:
                        self.log("❌ No file input found anywhere")
                        return

                except Exception as e:
                    self.log(f"❌ Error during file upload: {e}")

                self.log(f"✅ Completed automation for class {class_code} with {len(students)} student(s)")

            self.log("All students processed successfully")
            
        except Exception as e:
            self.log(f"Automation error: {str(e)}")
            raise

    def run_automation(self, exam_file_path):
        try:
            self.exam_file_path = exam_file_path
            self.log("Starting automation...")
            self.update_status("Starting automation...", "blue")
            
            # Run the automation
            asyncio.run(self.automate_form())
            
            self.log("Automation completed successfully")
            self.update_status("Automation completed", "green")
            return True
            
        except Exception as e:
            self.log(f"Automation error: {str(e)}")
            self.update_status(f"Error: {str(e)}", "red")
            return False
        finally:
            # Clean up Playwright resources
            try:
                if hasattr(self, 'context'):
                    asyncio.run(self.context.close())
                    self.log("✅ Browser context closed")
                if hasattr(self, 'playwright'):
                    asyncio.run(self.playwright.stop())
                    self.log("✅ Playwright stopped")
            except Exception as cleanup_error:
                self.log(f"⚠️ Cleanup error: {cleanup_error}")

# Run the automation
if __name__ == "__main__":
    try:
        agent = WebAutomationAgent()
        exam_file_path = sys.argv[2] if len(sys.argv) > 2 else None
        success = agent.run_automation(exam_file_path)
        
        result = {
            "success": success,
            "message": "Automation completed" if success else "Automation failed"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        print(json.dumps(result))
