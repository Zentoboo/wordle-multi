 using Microsoft.AspNetCore.Mvc;
 using Microsoft.EntityFrameworkCore;
 using AuthApi.Data;
 using AuthApi.Services;
 using AuthApi.Hubs;
 using Microsoft.AspNetCore.Authentication.JwtBearer;
 using Microsoft.IdentityModel.Tokens;
 using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env file in development
if (builder.Environment.IsDevelopment())
{
    DotNetEnv.Env.Load();
}

// Add services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

 // Custom services
 builder.Services.AddSingleton<TokenService>();
 builder.Services.AddScoped<IRefreshTokenService, RefreshTokenService>();
 builder.Services.AddScoped<ILobbyService, LobbyService>();
 builder.Services.AddScoped<IConnectionService, ConnectionService>();

 // Register background services
 builder.Services.AddHostedService<TokenCleanupService>();
 builder.Services.AddHostedService<LobbyCleanupService>();

// Database
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") ?? throw new InvalidOperationException("JWT_KEY environment variable not set");
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "wordle-multi";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "wordle-multi";

 builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
     .AddJwtBearer(options =>
     {
         options.TokenValidationParameters = new TokenValidationParameters
         {
             ValidateIssuer = true,
             ValidateAudience = true,
             ValidateLifetime = true,
             ValidateIssuerSigningKey = true,
             ValidIssuer = jwtIssuer,
             ValidAudience = jwtAudience,
             IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
         };

         options.Events = new JwtBearerEvents
         {
             OnMessageReceived = context =>
             {
                 var accessToken = context.Request.Query["access_token"];
                 var path = context.HttpContext.Request.Path;
                 if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                 {
                     context.Token = accessToken;
                 }
                 return Task.CompletedTask;
             }
         };
     });

 builder.Services.AddAuthorization();

 // SignalR
 builder.Services.AddSignalR(options => {
     options.EnableDetailedErrors = true;
 });

  // CORS for React
 builder.Services.AddCors(options =>
 {
    options.AddPolicy("AllowReact",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
 });

var app = builder.Build();

// Create database if it doesn't exist
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    context.Database.EnsureCreated();
}

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowReact");

 //auth
 app.UseAuthentication();
 app.UseAuthorization();

 app.MapControllers();
 app.MapHub<MultiplayerHub>("/hubs/multiplayer");

 app.Run();
