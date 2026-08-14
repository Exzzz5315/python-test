# 练习代码目录

建议每天新建一个目录，例如 `day01`、`day02`，并保留三个文件：

```text
day01/
├── notes.md
├── practice.py
└── test_practice.py
```

运行方式：

```bash
source ../.venv/bin/activate
python day01/practice.py
pytest day01/test_practice.py
ruff check day01
```

每次练习完成后，用下面四个问题复盘：

1. 输入和输出分别是什么？
2. 异常情况如何处理？
3. 哪部分能写成可测试的纯函数？
4. 如果需求变化，哪一处最可能需要修改？
