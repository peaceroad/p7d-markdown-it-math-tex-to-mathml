数式は変換されます。$x$段落。段$x=ab$落$z+c$。段落。

$$
x^2+y^2=z^2
$$

$$
\int f(g(x)) g'(x) \, dx = \int f(u) \, du
$$

$$
e^x = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots = \sum_{n=0}^{\infty} \frac{x^n}{n!}
$$

$$
f(x) = f(a) + f'(a)(x - a) + \frac{f''(a)}{2!}(x - a)^2 + \frac{f'''(a)}{3!}(x - a)^3 + \cdots
$$

$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!} (x - a)^n
$$

マクスウェル方程式。複数行の数式の中央揃え。

$$
\begin{align}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\epsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \epsilon_0 \frac{\partial \mathbf{E}}{\partial t} \\
\end{align}
$$

2×2行列の積。

$$
C = AB = \begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
e & f \\
g & h
\end{pmatrix} = \begin{pmatrix}
ae + bg & af + bh \\
ce + dg & cf + dh
\end{pmatrix}
$$

リーマンゼータ関数の定義からオイラー積表示。

$$
\begin{align}
\zeta(s) &= \sum_{n=1}^{\infty} \frac{1}{n^s} \\
n &= p_1^{k_1} p_2^{k_2} \cdots p_m^{k_m} \\
\zeta(s) &= \sum_{n=1}^{\infty} \frac{1}{n^s} = \prod_{p \, \text{prime}} \left( \sum_{k=0}^{\infty} \frac{1}{p^{ks}} \right) \\
\sum_{k=0}^{\infty} \frac{1}{p^{ks}} &= \frac{1}{1 - \frac{1}{p^s}} \\
\zeta(s) &= \prod_{p \, \text{prime}} \left( 1 - \frac{1}{p^s} \right)^{-1}
\end{align}
$$

波動関数

$$
\int_{-\infty}^{\infty} |\Psi(\mathbf{r}, t)|^2 \, d\mathbf{r} = 1 \tag{1}
$$

確率密度

$$
P(\mathbf{r}, t) = |\Psi(\mathbf{r}, t)|^2 \tag{2}
$$

規格化条件

$$
\int_{-\infty}^{\infty} P(\mathbf{r}, t) \, d\mathbf{r} = 1 \tag{3}
$$

$$
\int_{-\infty}^{\infty} |\Psi(\mathbf{r}, t)|^2 \, d\mathbf{r} = 1 \tag{4}
$$

状態の内積

$$
\langle \psi | \phi \rangle = \int \psi^*(\mathbf{r}) \phi(\mathbf{r}) \, d\mathbf{r} \tag{5}
$$

確率解釈

$$
P(\phi) = |\langle \phi | \psi \rangle|^2 = \left| \int \phi^*(\mathbf{r}) \psi(\mathbf{r}) \, d\mathbf{r} \right|^2 \tag{6}
$$


因数分解

$$
\begin{align}
f(x) &= x^3 - 3x^2 + 4 \\
  &= (x - 2)(x^2 - x - 2) \\
  &= (x - 2)(x - 2)(x + 1) \\
  &= (x - 2)^2(x + 1)
\end{align}
$$

Test

$$
a = b \tag{A}
$$


$$
\begin{align}
a = b\tag{1}\\
b = c\tag{2}
\end{align}
$$

$$
\begin{align}
f(x) &= x^3 - 3x^2 + 4 \\
  &= (x - 2)(x^2 - x - 2) \tag{2}\\
  &= (x - 2)(x - 2)(x + 1) \\
  &= (x - 2)^2(x + 1)
\end{align}
$$


<section class="sc-reference">
<p><span class="sc-reference-label">Reference</span></p>
<ul>
<li><a href="https://github.com/mathjax/MathJax-demos-web">MathJax-demos-web</a></li>
<li><a href="https://fred-wang.github.io/MathFonts/mozilla_mathml_test/">Mozilla MathML Test</a></li>
<li><a href="https://w3c.github.io/mathml-core/#user-agent-stylesheet">MathML Core - A. User Agent Stylesheet</a></li>
</ul>
</section>
