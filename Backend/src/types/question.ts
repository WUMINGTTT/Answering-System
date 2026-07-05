/**
 * 【文件说明】题目类型定义
 *
 * 本文件定义了答题系统中题目相关的所有 TypeScript 类型
 * 包括：题目类型、题目分类、题目接口、创建/更新题目的类型
 *
 * 【技术学习】TypeScript 类型系统
 * TypeScript 提供两种主要的类型定义方式：
 * 1. type（类型别名）：用于定义联合类型、交叉类型、工具类型等
 * 2. interface（接口）：用于定义对象的结构，支持继承和合并
 *
 * 选择建议：
 * - 定义对象结构时优先使用 interface（支持声明合并）
 * - 定义联合类型、交叉类型、工具类型时使用 type
 * - 本文件中 QuestionType 和 QuestionCategory 使用 type（联合类型）
 * - Question 使用 interface（对象结构）
 */

/**
 * 【技术学习】联合类型（Union Type）
 * 使用 | 分隔多个类型，表示变量可以是其中任意一种类型
 *
 * 题目类型：单选题、多选题、主观题
 *
 * 示例：
 * const type: QuestionType = 'single';  // ✅ 正确
 * const type: QuestionType = 'test';    // ❌ 错误，不在联合类型中
 */
export type QuestionType = 'single' | 'multiple' | 'subjective';

/**
 * 题目所属分类
 * - required：必答题，所有选手必须回答
 * - quick-answer：抢答题，选手通过抢答获得答题机会
 * - risk：风险题，答对加分，答错扣分
 */
export type QuestionCategory = 'required' | 'quick-answer' | 'risk';

/**
 * 【技术学习】interface（接口）
 * 用于定义对象的结构，描述对象应该包含哪些属性及其类型
 *
 * 接口的特点：
 * 1. 支持继承：可以通过 extends 继承其他接口
 * 2. 支持声明合并：同名接口会自动合并
 * 3. 可选属性：使用 ? 标记属性为可选
 * 4. 只读属性：使用 readonly 标记属性为只读
 *
 * 题目接口：定义题目的完整数据结构
 */
export interface Question {
  /** 题目唯一标识符，使用 nanoid 生成 */
  id: string;

  /** 题目类型：single（单选）/ multiple（多选）/ subjective（主观） */
  type: QuestionType;

  /** 题目分类：required（必答）/ quick-answer（抢答）/ risk（风险） */
  category: QuestionCategory;

  /** 题干：题目的描述文本 */
  stem: string;

  /**
   * 选项列表：存储所有选项的文本
   * 示例：['选项A', '选项B', '选项C', '选项D']
   * 主观题时可以为空数组
   */
  options: string[];

  /**
   * 正确答案列表
   * 单选题：['A']
   * 多选题：['A', 'B', 'C']
   * 主观题：['参考答案文本']
   */
  answers: string[];

  /** 分值：答对该题可获得的分数 */
  score: number;
}

/**
 * 【技术学习】Omit 工具类型
 * Omit<T, K> 从类型 T 中排除指定的属性 K，生成新类型
 *
 * 语法：Omit<Type, Keys>
 * - Type：源类型
 * - Keys：要排除的属性名（可以是单个或联合类型）
 *
 * 示例：
 * interface User { id: string; name: string; age: number; }
 * type UserWithoutId = Omit<User, 'id'>;
 * // 结果：{ name: string; age: number; }
 *
 * 本例中：创建题目时不需要传 id（由后端自动生成）
 */
export type CreateQuestion = Omit<Question, 'id'>;

/**
 * 【技术学习】Partial 工具类型
 * Partial<T> 将类型 T 的所有属性变为可选
 *
 * 语法：Partial<Type>
 *
 * 示例：
 * interface User { id: string; name: string; age: number; }
 * type PartialUser = Partial<User>;
 * // 结果：{ id?: string; name?: string; age?: number; }
 *
 * 本例中：修改题目时，所有字段都是可选的（只传需要修改的字段）
 */
export type UpdateQuestion = Partial<CreateQuestion>;
