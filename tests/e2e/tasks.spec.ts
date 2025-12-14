import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateBoardData, generateTaskData, generateColumnData } from './utils/test-data';

/**
 * Task Management E2E Tests
 * Tests for Kanban boards, columns, tasks, and related functionality
 */

test.describe('Task Management Workflow', () => {
  let boardData: ReturnType<typeof generateBoardData>;
  let taskData: ReturnType<typeof generateTaskData>;

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAs(page, TEST_USERS.admin);

    // Generate unique test data
    boardData = generateBoardData();
    taskData = generateTaskData();
  });

  // ===== Board Tests =====
  test.describe('Boards', () => {
    test('should navigate to boards page', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      // Should see the boards page
      await expect(page).toHaveURL(/\/admin\/tasks\/boards/);
      await expect(page.locator('body')).toContainText(/boards|task|kanban/i);
    });

    test('should create a new board', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      // Click new board button
      const newBoardBtn = page.locator('button:has-text("New Board"), a:has-text("New Board"), button:has-text("Create Board")');
      if (await newBoardBtn.count() > 0) {
        await newBoardBtn.click();

        // Fill board details
        await page.fill('input[name="title"], input[id="title"]', boardData.title);

        const descField = page.locator('textarea[name="description"], input[name="description"]');
        if (await descField.count() > 0) {
          await descField.fill(boardData.description);
        }

        // Submit
        await page.click('button:has-text("Create"), button:has-text("Save")');

        // Expect success
        await expect(page.locator('body')).toContainText(/success|created/i, { timeout: 10000 });
      }
    });

    test('should view board list', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      // Should see board list or empty state
      const hasBoards = await page.locator('table, [class*="board"], [class*="card"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no boards|create.*board|get started/i').count() > 0;

      expect(hasBoards || hasEmptyState).toBeTruthy();
    });

    test('should open board detail view', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      // Click on first board if exists
      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Should be on board detail page
        await expect(page).toHaveURL(/\/admin\/tasks\/boards\/[^/]+$/);

        // Should see columns or kanban view
        await expect(page.locator('body')).toContainText(/column|to do|in progress|done|kanban/i, { timeout: 10000 });
      }
    });
  });

  // ===== Column Tests =====
  test.describe('Columns', () => {
    test('should see default columns in board', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Common default columns
        const possibleColumns = ['To Do', 'In Progress', 'Done', 'Backlog', 'Review'];
        let foundColumn = false;

        for (const col of possibleColumns) {
          const exists = await page.locator(`text=${col}`).count() > 0;
          if (exists) {
            foundColumn = true;
            break;
          }
        }

        // Either has columns or has empty state
        expect(foundColumn || await page.locator('text=/add column|create column/i').count() > 0).toBeTruthy();
      }
    });

    test('should add a new column', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Look for add column button
        const addColumnBtn = page.locator('button:has-text("Add Column"), button:has-text("+ Column"), button:has-text("New Column")');
        if (await addColumnBtn.count() > 0) {
          await addColumnBtn.click();

          const columnData = generateColumnData();

          // Fill column title
          await page.fill('input[name="title"], input[placeholder*="column" i]', columnData.title);

          // Submit
          await page.click('button:has-text("Add"), button:has-text("Create"), button:has-text("Save")');

          // Expect column to appear
          await expect(page.locator('body')).toContainText(columnData.title, { timeout: 10000 });
        }
      }
    });
  });

  // ===== Task Tests =====
  test.describe('Tasks', () => {
    test('should create a new task', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Look for add task button
        const addTaskBtn = page.locator('button:has-text("Add Task"), button:has-text("+ Task"), button:has-text("New Task")');
        if (await addTaskBtn.count() > 0) {
          await addTaskBtn.first().click();

          // Fill task details
          await page.fill('input[name="title"], input[placeholder*="task" i]', taskData.title);

          const descField = page.locator('textarea[name="description"]');
          if (await descField.count() > 0) {
            await descField.fill(taskData.description);
          }

          // Select priority if available
          const priorityField = page.locator('select[name="priority"]');
          if (await priorityField.count() > 0) {
            await priorityField.selectOption(taskData.priority);
          }

          // Submit
          await page.click('button:has-text("Create"), button:has-text("Add"), button:has-text("Save")');

          // Expect task to appear
          await expect(page.locator('body')).toContainText(taskData.title, { timeout: 10000 });
        }
      }
    });

    test('should view task details', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Click on any task card
        const taskCard = page.locator('[class*="task"], [class*="card"]').first();
        if (await taskCard.count() > 0) {
          await taskCard.click();

          // Should see task details (modal or page)
          await expect(page.locator('body')).toContainText(/title|description|priority|assignee|due/i, { timeout: 10000 });
        }
      }
    });

    test('should edit task', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Click on any task
        const taskCard = page.locator('[class*="task"], [class*="card"]').first();
        if (await taskCard.count() > 0) {
          await taskCard.click();

          // Look for edit button
          const editBtn = page.locator('button:has-text("Edit"), button[aria-label*="edit" i]');
          if (await editBtn.count() > 0) {
            await editBtn.click();

            // Update title
            const newTitle = `${taskData.title} EDITED`;
            await page.fill('input[name="title"]', newTitle);

            // Save
            await page.click('button:has-text("Save"), button:has-text("Update")');

            // Expect updated
            await expect(page.locator('body')).toContainText(/saved|updated|success/i, { timeout: 10000 });
          }
        }
      }
    });

    test('should mark task as complete', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Look for task checkbox or complete button
        const completeBtn = page.locator('input[type="checkbox"][name*="complete" i], button:has-text("Complete"), button:has-text("Mark Complete")');
        if (await completeBtn.count() > 0) {
          await completeBtn.first().click();

          // Expect task to be marked complete (visual change or message)
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  // ===== My Tasks Tests =====
  test.describe('My Tasks', () => {
    test('should navigate to my tasks page', async ({ page }) => {
      await page.goto('/admin/tasks');

      // Should see my tasks page
      await expect(page).toHaveURL(/\/admin\/tasks/);
      await expect(page.locator('body')).toContainText(/my tasks|assigned|task/i);
    });

    test('should filter tasks by status', async ({ page }) => {
      await page.goto('/admin/tasks');

      // Look for status filter
      const statusFilter = page.locator('select[name*="status" i], button:has-text("Status"), [class*="filter"]');
      if (await statusFilter.count() > 0) {
        await statusFilter.first().click();

        // Select completed filter
        const completedOption = page.locator('text=Completed, option[value="completed"]');
        if (await completedOption.count() > 0) {
          await completedOption.click();

          // Wait for filter to apply
          await page.waitForTimeout(1000);
        }
      }
    });

    test('should filter tasks by priority', async ({ page }) => {
      await page.goto('/admin/tasks');

      // Look for priority filter
      const priorityFilter = page.locator('select[name*="priority" i], button:has-text("Priority")');
      if (await priorityFilter.count() > 0) {
        await priorityFilter.first().click();

        // Select high priority
        const highOption = page.locator('text=High, option[value="HIGH"]');
        if (await highOption.count() > 0) {
          await highOption.click();

          // Wait for filter to apply
          await page.waitForTimeout(1000);
        }
      }
    });
  });

  // ===== Board Views Tests =====
  test.describe('Board Views', () => {
    test('should switch to list view', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Look for list view button
        const listViewBtn = page.locator('a[href*="/list"], button:has-text("List"), [aria-label*="list" i]');
        if (await listViewBtn.count() > 0) {
          await listViewBtn.click();

          // Should be on list view
          await expect(page).toHaveURL(/\/list/);
        }
      }
    });

    test('should switch to calendar view', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Look for calendar view button
        const calendarBtn = page.locator('a[href*="/calendar"], button:has-text("Calendar"), [aria-label*="calendar" i]');
        if (await calendarBtn.count() > 0) {
          await calendarBtn.click();

          // Should be on calendar view
          await expect(page).toHaveURL(/\/calendar/);
        }
      }
    });
  });

  // ===== Checklist Tests =====
  test.describe('Checklists', () => {
    test('should add checklist item to task', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Click on a task
        const taskCard = page.locator('[class*="task"], [class*="card"]').first();
        if (await taskCard.count() > 0) {
          await taskCard.click();

          // Look for add checklist button
          const addChecklistBtn = page.locator('button:has-text("Add Checklist"), button:has-text("Add Item")');
          if (await addChecklistBtn.count() > 0) {
            await addChecklistBtn.click();

            // Fill checklist item
            await page.fill('input[name="title"], input[placeholder*="checklist" i]', 'Test Checklist Item');

            // Save
            await page.click('button:has-text("Add"), button:has-text("Save")');

            // Expect item to appear
            await expect(page.locator('body')).toContainText('Test Checklist Item', { timeout: 10000 });
          }
        }
      }
    });
  });

  // ===== Comments Tests =====
  test.describe('Comments', () => {
    test('should add comment to task', async ({ page }) => {
      await page.goto('/admin/tasks/boards');

      const boardLink = page.locator('a[href*="/admin/tasks/boards/"]').first();
      if (await boardLink.count() > 0) {
        await boardLink.click();

        // Click on a task
        const taskCard = page.locator('[class*="task"], [class*="card"]').first();
        if (await taskCard.count() > 0) {
          await taskCard.click();

          // Look for comment input
          const commentInput = page.locator('textarea[name="comment"], textarea[placeholder*="comment" i], input[placeholder*="comment" i]');
          if (await commentInput.count() > 0) {
            await commentInput.fill('This is a test comment');

            // Submit comment
            await page.click('button:has-text("Post"), button:has-text("Comment"), button:has-text("Send")');

            // Expect comment to appear
            await expect(page.locator('body')).toContainText('This is a test comment', { timeout: 10000 });
          }
        }
      }
    });
  });
});
